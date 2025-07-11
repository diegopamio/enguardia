# Tournament Architecture Documentation

## Overview

Enguardia has been redesigned to use a hierarchical **Tournament > Competition > Phase** architecture that accurately reflects how real fencing tournaments are organized and operated.

## Architecture Hierarchy

### 1. Tournament (Top Level)
The **Tournament** is the overall event container that represents what most people think of as a "fencing tournament."

**Examples:**
- "Copa de Navidad 2024"
- "Nacional de Épée Juvenil"
- "Torneo Internacional de Madrid"

**Key Properties:**
- Name, description, dates, venue
- Organization owner
- Public/private visibility
- Active status (only one per organization can be active)
- Translations for internationalization

### 2. Competition (Middle Level)
A **Competition** represents a specific weapon + category combination within a tournament.

**Examples within "Copa de Navidad 2024":**
- Épée Senior Men
- Foil Junior Women  
- Sabre Veteran Men
- Épée Senior Women

**Key Properties:**
- Tournament reference (parent)
- Weapon (ÉPÉE, FOIL, SABRE)
- Category (Senior Men, Junior Women, etc.)
- Max participants
- Registration deadline
- Status tracking
- Participant registrations

### 3. Phase (Bottom Level)
A **Phase** represents the different stages within a competition.

**Standard Fencing Phases:**
- **Poules** (Round-robin pools)
- **Direct Elimination** (Knockout brackets)
- **Classification** (Final ranking determination)

**Key Properties:**
- Competition reference (parent)
- Phase type and sequence order
- Start/end times
- Status (scheduled, in-progress, completed)

## Global Club System

### Overview
Clubs in Enguardia are **global entities** that can be affiliated with multiple organizations. This design reflects the real-world nature of fencing clubs, which may participate in multiple federations (regional, national, international) while maintaining their own identity.

### Club Architecture

#### Global Club Entity
Clubs are not owned by organizations but exist as independent global entities that can be **linked** to multiple organizations.

**Key Properties:**
- Unique global identifier
- Name, city, country (from predefined list)
- Global visibility and searchability
- Creation and modification timestamps

#### Organization-Club Affiliation
The relationship between clubs and organizations is managed through a many-to-many junction table that tracks:
- Affiliation status (ACTIVE, INACTIVE, SUSPENDED)
- Affiliation type (MEMBER, PARTNER, AFFILIATE)
- Start and end dates of affiliation
- Organization-specific club settings

#### Athlete-Club Membership
Athletes can be associated with clubs through a separate many-to-many relationship:
- Membership type (MEMBER, JUNIOR, VETERAN, GUEST)
- Primary club designation (one per athlete)
- Membership status (ACTIVE, INACTIVE, SUSPENDED)
- Membership dates and history

### Country Standardization
- Countries are selected from a predefined list (ISO 3166-1 alpha-2)
- Supports internationalization with country names in multiple languages
- Enables proper geographic organization and filtering

### Access Control and Permissions

#### Club Creation
- **System Admins**: Can create any club globally
- **Organization Admins**: Can create clubs and automatically link them to their organization
- **Regular Users**: Cannot create clubs directly (request-based creation)

#### Club Management
- **Club Creators**: Can edit basic club information
- **Organization Admins**: Can edit clubs affiliated with their organization
- **System Admins**: Can edit any club globally

#### Club Affiliation Management
- **Organization Admins**: Can link/unlink clubs to/from their organization
- **System Admins**: Can manage any club-organization relationship
- **Club Representatives**: Can request affiliation with organizations

### Business Rules

#### Club Rules
1. **Uniqueness**: Club names must be unique within the same city/country combination
2. **Global Visibility**: All clubs are searchable globally for athlete association
3. **Country Validation**: Country must be selected from predefined ISO list
4. **Modification Rights**: Only authorized users can modify club information

#### Affiliation Rules
1. **Multiple Organizations**: Clubs can be affiliated with multiple organizations simultaneously
2. **Affiliation Status**: Each club-organization relationship has independent status
3. **Historical Tracking**: All affiliation changes are tracked with timestamps
4. **Auto-linking**: New clubs created by organization admins are automatically linked

#### Athlete Membership Rules
1. **Primary Club**: Each athlete can designate one primary club
2. **Multiple Memberships**: Athletes can be members of multiple clubs
3. **Organization Scope**: Club memberships are independent of organization memberships
4. **Historical Tracking**: All membership changes are tracked with dates

### Database Schema

#### Club
```sql
Club {
  id          String    @id @default(cuid())
  name        String
  city        String?
  country     String    // ISO 3166-1 alpha-2 code
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdById String?
  
  // Relations
  organizations   ClubOrganization[]
  athletes        AthleteClub[]
  createdBy       User?              @relation(fields: [createdById], references: [id])
  
  @@unique([name, city, country])
  @@index([country])
  @@index([name])
}
```

#### ClubOrganization (Junction Table)
```sql
ClubOrganization {
  id             String              @id @default(cuid())
  clubId         String
  organizationId String
  affiliationType AffiliationType    @default(MEMBER)
  status         AffiliationStatus   @default(ACTIVE)
  startDate      DateTime            @default(now())
  endDate        DateTime?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  
  // Relations
  club           Club                @relation(fields: [clubId], references: [id], onDelete: Cascade)
  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@unique([clubId, organizationId])
  @@index([organizationId])
}
```

#### AthleteClub (Junction Table)
```sql
AthleteClub {
  id             String            @id @default(cuid())
  athleteId      String
  clubId         String
  membershipType MembershipType    @default(MEMBER)
  status         MembershipStatus  @default(ACTIVE)
  isPrimary      Boolean           @default(false)
  startDate      DateTime          @default(now())
  endDate        DateTime?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  
  // Relations
  athlete        Athlete           @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  club           Club              @relation(fields: [clubId], references: [id], onDelete: Cascade)
  
  @@unique([athleteId, clubId])
  @@index([clubId])
  @@index([athleteId, isPrimary])
}
```

### API Endpoints

#### Club Management
```
GET    /api/clubs                    # List clubs globally with filtering
POST   /api/clubs                    # Create new club
GET    /api/clubs/{id}               # Get club details with affiliations
PUT    /api/clubs/{id}               # Update club information
DELETE /api/clubs/{id}               # Delete club (if no associations)

GET    /api/clubs/countries          # Get list of supported countries
GET    /api/clubs/search?q={query}   # Search clubs globally
```

#### Club-Organization Affiliation
```
POST   /api/clubs/{id}/organizations/{orgId}    # Link club to organization
PUT    /api/clubs/{id}/organizations/{orgId}    # Update affiliation details
DELETE /api/clubs/{id}/organizations/{orgId}    # Unlink club from organization
```

#### Athlete-Club Membership
```
POST   /api/athletes/{id}/clubs/{clubId}        # Add athlete to club
PUT    /api/athletes/{id}/clubs/{clubId}        # Update membership details
DELETE /api/athletes/{id}/clubs/{clubId}        # Remove athlete from club
PUT    /api/athletes/{id}/clubs/{clubId}/primary # Set as primary club
```

### UI/UX Considerations

#### Club Creation Flow
1. **Organization Admin**: Pre-populated organization field, automatic linking
2. **Country Selection**: Dropdown with searchable country list
3. **Duplicate Prevention**: Real-time validation for name+city+country uniqueness
4. **Immediate Availability**: New clubs immediately available for athlete association

#### Club Management Interface
1. **Global Club Directory**: Searchable list of all clubs with filters
2. **Organization View**: Clubs affiliated with current organization
3. **Athlete Association**: Easy club selection during athlete creation/editing
4. **Bulk Operations**: Support for importing/exporting club data

This global club system provides flexibility while maintaining proper data organization and access control.

## Data Relationships

```
Tournament (1) ──→ (Many) Competition (1) ──→ (Many) Phase
    ↓                      ↓                        ↓
Organization         Registrations           Poules/Brackets
Translations         Translations           Results/Rankings
```

## Benefits of This Architecture

### 1. **Real-World Accuracy**
- Matches how actual fencing tournaments are organized
- Supports multiple weapon categories running simultaneously
- Allows different timing for different competitions

### 2. **Operational Flexibility**
- Can run épée poules while foil does direct elimination
- Independent registration deadlines per competition
- Separate participant limits per weapon/category

### 3. **Data Organization**
- Clear hierarchical structure
- Proper separation of concerns
- Easier reporting and analytics

### 4. **Scalability**
- Supports small single-weapon events
- Handles large multi-day tournaments
- Can accommodate future tournament formats

## Database Schema

### Core Tables

#### Tournament
```sql
Tournament {
  id              String     @id @default(cuid())
  name            String
  description     String?
  startDate       DateTime
  endDate         DateTime
  venue           String?
  isPublic        Boolean    @default(false)
  isActive        Boolean    @default(false)
  status          TournamentStatus @default(DRAFT)
  organizationId  String
  createdById     String
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}
```

#### Competition
```sql
Competition {
  id                  String           @id @default(cuid())
  tournamentId        String
  name                String
  weapon              Weapon
  category            String
  maxParticipants     Int?
  registrationDeadline DateTime?
  status              CompetitionStatus @default(DRAFT)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
}
```

#### Phase
```sql
Phase {
  id            String      @id @default(cuid())
  competitionId String
  name          String
  phaseType     PhaseType
  sequenceOrder Int
  status        PhaseStatus @default(SCHEDULED)
  startTime     DateTime?
  endTime       DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

### Supporting Tables
- **TournamentTranslation**: Multi-language support for tournaments
- **CompetitionTranslation**: Multi-language support for competitions
- **PhaseTranslation**: Multi-language support for phases
- **Registration**: Links athletes to competitions (not tournaments)
- **Poule**: Belongs to phases within competitions
- **Bracket**: Direct elimination within phases
- **Bout**: Individual matches within poules or brackets

## API Endpoints

### Tournament Management
```
GET    /api/tournaments          # List tournaments
POST   /api/tournaments          # Create tournament
GET    /api/tournaments/{id}     # Get tournament details
PUT    /api/tournaments/{id}     # Update tournament
DELETE /api/tournaments/{id}     # Delete tournament
```

### Competition Management
```
GET    /api/competitions         # List competitions
POST   /api/competitions         # Create competition
GET    /api/competitions/{id}    # Get competition details
PUT    /api/competitions/{id}    # Update competition
DELETE /api/competitions/{id}    # Delete competition
```

### Legacy Event API (Backward Compatibility)
```
GET    /api/events              # Still works, maps to new structure
POST   /api/events              # Creates tournament + competition
# ... other legacy endpoints maintained
```

## Business Rules

### Tournament Rules
1. **Active Status**: Only one tournament per organization can be active at a time
2. **Visibility**: Tournaments can be public (visible to all) or private (organization only)
3. **Status Flow**: DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → IN_PROGRESS → COMPLETED
4. **Deletion**: Cannot delete tournaments with existing competitions

### Competition Rules
1. **Uniqueness**: No duplicate weapon+category combinations within the same tournament
2. **Tournament Dependency**: Competitions must belong to an existing tournament
3. **Registration**: Athletes register for specific competitions, not tournaments
4. **Status Inheritance**: Competition status should generally follow tournament status
5. **Deletion**: Cannot delete competitions with registered participants or phases

### Phase Rules
1. **Sequence**: Phases have ordered sequence within competitions
2. **Type Constraints**: Standard phase types are POULE, DIRECT_ELIMINATION, CLASSIFICATION
3. **Status Flow**: SCHEDULED → IN_PROGRESS → COMPLETED
4. **Timing**: Phase times should fall within competition/tournament dates

## Migration Strategy

### From Legacy Events
The system maintains backward compatibility by:

1. **Event API Mapping**: Legacy event endpoints create/update both tournament and competition
2. **Data Structure**: Single events become tournaments with one competition
3. **Automatic Migration**: Existing events are migrated to tournament+competition pairs
4. **Deprecation Path**: Legacy APIs will be marked deprecated but continue functioning

### Example Migration
**Before (Event):**
```json
{
  "id": "event1",
  "name": "Épée Senior Men",
  "weapon": "EPEE",
  "category": "Senior Men",
  "venue": "Sports Center"
}
```

**After (Tournament + Competition):**
```json
{
  "tournament": {
    "id": "tournament1",
    "name": "Épée Senior Men Tournament",
    "venue": "Sports Center"
  },
  "competition": {
    "id": "competition1",
    "tournamentId": "tournament1",
    "name": "Épée Senior Men",
    "weapon": "EPEE",
    "category": "Senior Men"
  }
}
```

## Implementation Examples

### Creating a Multi-Competition Tournament

```typescript
// 1. Create tournament
const tournament = await fetch('/api/tournaments', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Copa de Navidad 2024',
    description: 'Annual Christmas tournament',
    startDate: '2024-12-15T09:00:00Z',
    endDate: '2024-12-15T18:00:00Z',
    venue: 'Centro Deportivo Municipal',
    isPublic: true,
    organizationId: 'org123'
  })
})

// 2. Add competitions
const competitions = [
  { weapon: 'EPEE', category: 'Senior Men' },
  { weapon: 'FOIL', category: 'Junior Women' },
  { weapon: 'SABRE', category: 'Veteran Men' }
]

for (const comp of competitions) {
  await fetch('/api/competitions', {
    method: 'POST',
    body: JSON.stringify({
      tournamentId: tournament.id,
      name: `${comp.weapon} ${comp.category}`,
      weapon: comp.weapon,
      category: comp.category,
      maxParticipants: 32
    })
  })
}
```

### Registering Athletes

```typescript
// Athletes register for specific competitions, not tournaments
await fetch('/api/registrations', {
  method: 'POST',
  body: JSON.stringify({
    competitionId: 'competition1',  // Not tournamentId
    athleteId: 'athlete123'
  })
})
```

## User Interface Impact

### Tournament Dashboard
- Overview of all competitions within a tournament
- Status tracking per competition
- Participant counts and registration progress
- Phase status visualization

### Competition Management
- Individual competition setup and configuration
- Participant registration management
- Phase creation and progression
- Results entry and bracket management

### Navigation Structure
```
Tournaments
├── Copa de Navidad 2024
│   ├── Épée Senior Men (32 participants)
│   │   ├── Poules (completed)
│   │   ├── Direct Elimination (in progress)
│   │   └── Classification (scheduled)
│   ├── Foil Junior Women (16 participants)
│   │   └── Poules (in progress)
│   └── Sabre Veteran Men (8 participants)
│       └── Registration (open)
```

## Performance Considerations

### Indexing Strategy
- Tournament: organizationId, isActive, startDate
- Competition: tournamentId, weapon+category (composite unique)
- Phase: competitionId, sequenceOrder
- Registration: competitionId, athleteId

### Query Optimization
- Use includes to fetch related data efficiently
- Implement pagination for large tournament lists
- Cache frequently accessed tournament/competition data

## Testing Strategy

### Unit Tests
- Validation schema tests for all entities
- Business rule enforcement
- Authorization checks

### Integration Tests
- Full tournament creation workflow
- Multi-competition registration
- Phase progression scenarios

### End-to-End Tests
- Complete tournament lifecycle
- Real-world usage scenarios
- Data consistency verification

## Future Enhancements

### Potential Extensions
1. **Multi-Day Tournaments**: Enhanced scheduling across multiple days
2. **Team Competitions**: Support for team-based events alongside individual
3. **Qualification Systems**: Tournaments that feed into other tournaments
4. **Custom Phase Types**: Beyond standard poule/elimination/classification
5. **Venue Management**: Multiple venues within a single tournament

This architecture provides a solid foundation for supporting real-world fencing tournament complexity while maintaining system simplicity and performance. 