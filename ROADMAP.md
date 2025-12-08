# PadelParrot Feature Roadmap

This document outlines planned features for PadelParrot, organized by phase and priority.

---

## Phase 1: Social Features (Priority)

Building community and social interaction within the app.

### Free Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Player Profiles** | Tap a player to view their profile (avatar, name, matches played, member since) | Medium |
| **Match Comments** | Simple comment thread on match page for coordination ("I'll bring balls", "Running 5 mins late") | Medium |

### Premium Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Enhanced Partner Stats** | Deeper insights on frequent partners (when you last played together, how often you play together, win/loss if tracking) | Large |

---

## Phase 2: Quality of Life

Improving daily usability and convenience.

### Free Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Calendar Export** | "Add to Calendar" button that downloads ICS file for easy calendar integration | Small |
| **Match Search/Filter** | Search past matches by location or date range | Medium |

### Premium Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Match Insights** | See patterns like "You play most on Tuesdays" or "Your most active month was October" | Large |
| **Location Favorites** | Star preferred locations, show them first when creating matches | Small |

---

## Database Changes Preview

### Phase 1 Tables

```sql
-- Match comments for coordination
CREATE TABLE match_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 2 Tables

```sql
-- Favorite locations for premium users
CREATE TABLE favorite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, location_name)
);
```

---

## Implementation Estimates

### Complexity Guide

- **Small**: 1-2 hours, minimal backend changes
- **Medium**: 3-8 hours, some database/API work required
- **Large**: 1-2 days, significant backend and frontend work

### Recommended Order

1. **Calendar Export** (Small) - Quick win, high user value
2. **Player Profiles** (Medium) - Foundation for social features
3. **Match Comments** (Medium) - Core social feature
4. **Location Favorites** (Small) - Premium quick win
5. **Match Search/Filter** (Medium) - Improves usability
6. **Enhanced Partner Stats** (Large) - Premium differentiator
7. **Match Insights** (Large) - Premium analytics

---

## Future Considerations (Phase 3+)

Ideas for future exploration:

- **Push Notifications** - Real-time alerts for match updates
- **Match Reminders** - Automated reminders before matches
- **Player Ratings** - Optional skill level tracking
- **Group/Team Management** - Create recurring groups of players
- **Match History Export** - Download match history as CSV/PDF
- **Dark Mode Refinements** - Enhanced theming options

---

*Last updated: December 2024*
