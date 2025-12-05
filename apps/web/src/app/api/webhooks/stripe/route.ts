import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id
  if (!userId) {
    console.error('No supabase_user_id in session metadata')
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Upsert subscription record
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  if (error) {
    console.error('Error upserting subscription:', error)
    throw error
  }

  // Create default notification preferences
  await supabaseAdmin
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      day_before_enabled: true,
      ninety_min_before_enabled: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })

  console.log(`Subscription created for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    // Try to find user by customer ID
    const customerId = subscription.customer as string
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()
    
    if (!existingSub) {
      console.error('No user found for subscription')
      return
    }

    await updateSubscriptionRecord(existingSub.user_id, subscription)
    return
  }

  await updateSubscriptionRecord(userId, subscription)
}

async function updateSubscriptionRecord(userId: string, subscription: Stripe.Subscription) {
  // Map Stripe status to our status
  let status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  switch (subscription.status) {
    case 'active':
      status = 'active'
      break
    case 'canceled':
      status = 'cancelled'
      break
    case 'past_due':
      status = 'past_due'
      break
    case 'trialing':
      status = 'trialing'
      break
    default:
      status = 'cancelled'
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  console.log(`Subscription updated for user ${userId}: ${status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error marking subscription as cancelled:', error)
    throw error
  }

  console.log(`Subscription cancelled for customer ${customerId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Error updating subscription to past_due:', error)
    throw error
  }

  console.log(`Payment failed for customer ${customerId}`)
}
