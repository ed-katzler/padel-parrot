# Match Participants - How It Works

## Overview
When users create matches in PadelParrot, they are automatically added as participants to ensure proper tracking and functionality.

## Match Creation Flow

### 1. User Creates Match
- User fills out match creation form
- System validates user authentication
- Match is created in `matches` table with `current_players: 1`

### 2. Creator Auto-Join
- Creator is automatically added to `participants` table with `status: 'joined'`
- This ensures the creator appears in participant lists
- Match shows `current_players: 1` from the start

### 3. Error Handling
- If adding creator as participant fails, the match is automatically deleted
- This prevents orphaned matches without proper participation tracking

## Database Structure

### Matches Table
- `current_players`: Counter of how many people have joined
- `max_players`: Maximum allowed participants
- `creator_id`: References the user who created the match

### Participants Table
- Tracks all users who have joined matches
- Includes the creator as first participant
- Status can be: `'joined'`, `'left'`, `'maybe'`

## API Behavior

### Real Supabase Backend
```typescript
// 1. Create match with current_players = 1
const match = await supabase.from('matches').insert({
  ...matchData,
  creator_id: user.id,
  current_players: 1
})

// 2. Add creator to participants table
await supabase.from('participants').insert({
  match_id: match.id,
  user_id: user.id,
  status: 'joined'
})
```

### Mock Backend
- Also sets `current_players: 1` on creation
- Simulates the same behavior for consistent development experience

## Join/Leave Logic

### Joining a Match
1. Check if user is already a participant
2. Check if match has available space
3. Add to participants table
4. Increment `current_players` using RPC function

### Leaving a Match
1. Remove from participants table
2. Decrement `current_players` using RPC function
3. Creators can leave their own matches

## RPC Functions
- `increment_match_players(match_id)`: Safely increments player count
- `decrement_match_players(match_id)`: Safely decrements player count
- Both include validation to prevent invalid states

## Benefits
- ✅ Creators always appear in participant lists
- ✅ Accurate player counting from match creation
- ✅ Consistent behavior across real and mock backends
- ✅ Proper cleanup if participant addition fails
- ✅ Clear audit trail of who joined when 