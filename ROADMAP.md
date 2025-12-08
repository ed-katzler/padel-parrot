# PadelParrot Feature Roadmap

This document outlines planned features for PadelParrot, organized by release phase and tier (free vs premium).

---

## Current Features

### Free
- Match creation (public/private)
- Join/leave matches
- User profiles with avatars
- Location management
- Real-time updates via Supabase
- Match sharing
- Dark mode

### Premium (14-day free trial)
- Weather forecast with condensation risk
- Recurring matches (weekly/biweekly)
- Basic stats (total matches, monthly matches, top locations, frequent partners)
- SMS notification reminders (day before, 90 minutes before)

---

## Phase 1: Social Features

**Priority: High**

These features enhance the social/community aspect of the app, making it easier to connect with other players.

### Player Profiles (Free)

**Description:** Tap on any player in a match to view their public profile.

**Profile includes:**
- Avatar and name
- Total matches played
- Member since date
- Recent activity (optional)

**Complexity:** Small

**Database changes:** None - uses existing `users` table data

**UI changes:**
- Add tap handler to player avatars/names in match details
- Create new `/player/[id]` page or modal

---

### Match Comments (Free)

**Description:** Simple comment thread on the match details page for coordination.

**Use cases:**
- "I'll bring the balls"
- "Running 5 mins late"
- "Should we grab dinner after?"
- "Court 3 is booked, not court 2"

**Features:**
- Chronological list of comments
- Timestamp and author shown
- Only match participants can comment
- Comments visible to all participants

**Complexity:** Medium

**Database changes:**
```sql
CREATE TABLE match_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient retrieval
CREATE INDEX idx_match_comments_match_id ON match_comments(match_id);

-- RLS policy: only participants can view/create comments
```

**UI changes:**
- Add comments section to match details page
- Simple input field + send button
- Scrollable list of comments

---

### Enhanced Partner Stats (Premium)

**Description:** Deeper insights into your frequent playing partners.

**Features:**
- When you last played together
- How many times you've played together
- Which locations you typically play at together

**Complexity:** Small

**Database changes:** None - computed from existing `match_participants` data

**UI changes:**
- Enhance the "Frequent Partners" section on profile page
- Add "last played" date
- Optionally show common locations

---

## Phase 2: Quality of Life

**Priority: Medium**

These features improve the day-to-day usability of the app.

### Calendar Export (Free)

**Description:** "Add to Calendar" button on match details that downloads an ICS file.

**ICS file includes:**
- Match date/time and duration
- Location as the event location
- Match description
- Link back to match in app

**Complexity:** Small

**Database changes:** None

**UI changes:**
- Add "Add to Calendar" button to match details page
- Generate and download ICS file on tap

**Implementation notes:**
```typescript
// ICS format example
const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(match.date_time)}
DTEND:${formatDate(endTime)}
SUMMARY:Padel Match
LOCATION:${match.location}
DESCRIPTION:${match.description || 'Padel match'}
URL:${appUrl}/match/${match.id}
END:VEVENT
END:VCALENDAR`
```

---

### Match Search/Filter (Free)

**Description:** Search and filter past matches by location or date range.

**Features:**
- Text search by location name
- Date range filter (this week, this month, custom)
- Sort by date (newest/oldest)

**Complexity:** Medium

**Database changes:** None - filtering done on existing data

**UI changes:**
- Add search bar to "Past Matches" section
- Add filter dropdown/modal
- Update match list to respect filters

---

### Match Insights (Premium)

**Description:** Discover patterns in your playing habits.

**Insights include:**
- "You play most on Tuesdays"
- "Your most active month was October"
- "You've played 12 matches at [Location]"
- "You average 2.3 matches per week"

**Complexity:** Medium

**Database changes:** None - computed from existing data

**UI changes:**
- Add "Insights" card to profile page (below existing stats)
- Display 2-3 interesting insights

---

### Location Favorites (Premium)

**Description:** Star your preferred locations so they appear first when creating matches.

**Features:**
- Star/unstar locations from location picker
- Starred locations appear at top of list
- Visual indicator for favorited locations

**Complexity:** Small

**Database changes:**
```sql
CREATE TABLE favorite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);
```

**UI changes:**
- Add star icon to location picker items
- Sort favorited locations to top
- Show favorites section in location picker

---

## Implementation Priority

| Feature | Tier | Complexity | Priority |
|---------|------|------------|----------|
| Player Profiles | Free | Small | High |
| Match Comments | Free | Medium | High |
| Enhanced Partner Stats | Premium | Small | High |
| Calendar Export | Free | Small | Medium |
| Match Search/Filter | Free | Medium | Medium |
| Match Insights | Premium | Medium | Low |
| Location Favorites | Premium | Small | Low |

---

## Notes

- All features should respect the existing design system and dark mode
- Premium features should show appropriate upsell UI for free users
- Database migrations should be backwards compatible
- Real-time updates should be considered for Match Comments
