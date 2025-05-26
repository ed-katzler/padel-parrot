# PadelParrot

**PadelParrot** is a web-based application designed to simplify how people organize and join padel matches. It delivers a fast, intuitive, mobile-first experience that works seamlessly for both casual and committed players. The app is optimized for users who typically coordinate matches in WhatsApp groups but need a better way to manage game details and participation.

---

## Overview

PadelParrot focuses entirely on **padel game creation, sharing, and participation**.

### Core Capabilities:
- **Create padel matches** by specifying time, date, location, and number of players.
- **Share matches** via unique links — optimised for WhatsApp and social messaging.
- **Join or leave matches** with a single tap (no complex signup process).
- **Track matches** in a personal dashboard: Upcoming and Past sections.
- **Receive SMS reminders** before matches start.

---

## Authentication

Users sign in using **phone number authentication**.  
An OTP (One-Time Password) is sent to the user via **SMS**.  
This is implemented using **Supabase Auth** with **Twilio Verify** as the SMS provider.

---

## Key Features

- **Instant Phone Login**: Users authenticate with a phone number and a one-time SMS code.
- **Fast Match Creation**: Lightweight form to set up a new game in seconds.
- **WhatsApp-Optimized Sharing**: Easily share game invites to WhatsApp groups with smart preview links.
- **Join via Link**: Match links bring users directly to the game — no account setup required beyond a phone number.
- **Participant View**: See who has joined, how many spots are left, and when/where to play.
- **SMS Reminders**: Automatic text message reminders before each match.

---

## Tech Dependencies

- **Database & Auth**: Powered by [Supabase](https://supabase.com/)
  - Stores users, matches, and participation data.
  - Manages phone authentication via Twilio Verify.
- **Frontend Stack**: Built with modern web technologies.
  - Designed to be lightweight, mobile-first, and accessible.
  - Component system should use utility-first CSS (e.g. TailwindCSS).

---

## Future Roadmap

Potential future enhancements include:
- **Club Tools**: Dashboards for padel venues to manage court bookings and member participation.
- **Skill-Based Matching**: Optional rating system to help players find more competitive games.
- **Recurring Games**: Templates for weekly recurring matches.
- **In-App Chat**: Threaded discussion tied to each match.
- **Native App Support**: Adapt the web version into React Native/Expo if needed.

---

## Development Goals

- Deliver a clear, responsive MVP that focuses solely on organising padel games.
- Eliminate friction — users should create or join a game within seconds.
- Prioritise UX, performance, and minimalism to support scale and quick user adoption.

---

## For Developers Using This File in Cursor

Use this README to guide the app’s purpose and scope:

- The app is **only about padel match organisation** — no equipment guides or product content.
- Users authenticate via **phone number (SMS OTP)**.
- The core data model includes **matches**, **users**, and **participants**.
- UX flow: *Create match → Share link → Join match → Play → Reminder → Repeat*.

Keep the code modular, lightweight, and extensible for future use cases.