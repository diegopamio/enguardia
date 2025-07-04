# API Reference - Tournament & Competition Management

## Overview

This document covers the API endpoints for the new Tournament/Competition architecture. The system now uses a hierarchical structure:

- **Tournament**: Overall event container
- **Competition**: Specific weapon+category within a tournament  
- **Phase**: Stages within a competition (poules, elimination, etc.)

## Authentication

All endpoints require authentication via NextAuth.js session. Include session token in requests.

```typescript
// Example with fetch
const response = await fetch('/api/tournaments', {
  headers: {
    'Content-Type': 'application/json',
    // Session cookie is automatically included
  }
})
```

## Tournament Endpoints

### `GET /api/tournaments`

List tournaments with filtering and pagination.

**Query Parameters:**
- `organizationId` (string, optional): Filter by organization
- `status` (string, optional): Filter by status (DRAFT, REGISTRATION_OPEN, etc.)
- `limit` (number, optional): Number of results (default: 20, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "tournaments": [
    {
      "id": "cuid123",
      "name": "Copa de Navidad 2024",
      "description": "Annual Christmas tournament",
      "startDate": "2024-12-15T09:00:00.000Z",
      "endDate": "2024-12-15T18:00:00.000Z",
      "venue": "Centro Deportivo Municipal",
      "isPublic": true,
      "isActive": true,
      "status": "REGISTRATION_OPEN",
      "organizationId": "org123",
      "createdById": "user123",
      "organization": {
        "id": "org123",
        "name": "Club Esgrima Madrid"
      },
      "createdBy": {
        "id": "user123",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      },
      "translations": [
        {
          "locale": "en",
          "name": "Christmas Cup 2024",
          "description": "Annual Christmas tournament"
        }
      ],
      "competitionCount": 3,
      "totalParticipants": 45
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### `POST /api/tournaments`

Create a new tournament.

**Request Body:**
```json
{
  "name": "Copa de Navidad 2024",
  "description": "Annual Christmas tournament",
  "startDate": "2024-12-15T09:00:00.000Z",
  "endDate": "2024-12-15T18:00:00.000Z",
  "venue": "Centro Deportivo Municipal",
  "isPublic": true,
  "isActive": false,
  "status": "DRAFT",
  "organizationId": "org123",
  "createdById": "user123",
  "translations": {
    "en": {
      "name": "Christmas Cup 2024",
      "description": "Annual Christmas tournament"
    },
    "fr": {
      "name": "Coupe de Noël 2024",
      "description": "Tournoi annuel de Noël"
    }
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "cuid123",
  "name": "Copa de Navidad 2024",
  // ... full tournament object with relations
}
```

### `GET /api/tournaments/{id}`

Get detailed information about a specific tournament.

**Response:**
```json
{
  "id": "cuid123",
  "name": "Copa de Navidad 2024",
  // ... basic tournament fields
  "competitions": [
    {
      "id": "comp1",
      "name": "Épée Senior Men",
      "weapon": "EPEE",
      "category": "Senior Men",
      "status": "REGISTRATION_OPEN",
      "participantCount": 18,
      "phaseCount": 0,
      "registrations": [/* athlete details */],
      "phases": [/* phase details */]
    }
  ],
  "competitionCount": 3,
  "totalParticipants": 45
}
```

### `PUT /api/tournaments/{id}`

Update an existing tournament.

**Request Body:** Same structure as POST, but all fields optional
```json
{
  "name": "Updated Tournament Name",
  "isActive": true,
  "status": "REGISTRATION_OPEN"
}
```

**Response:** `200 OK` with updated tournament object

### `DELETE /api/tournaments/{id}`

Delete a tournament (only if no competitions exist).

**Response:** `200 OK`
```json
{
  "message": "Tournament deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Tournament has existing competitions
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Tournament not found

## Competition Endpoints

### `GET /api/competitions`

List competitions with filtering and pagination.

**Query Parameters:**
- `tournamentId` (string, optional): Filter by tournament
- `weapon` (string, optional): Filter by weapon (EPEE, FOIL, SABRE)
- `category` (string, optional): Filter by category
- `status` (string, optional): Filter by status
- `limit` (number, optional): Number of results (default: 20)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "competitions": [
    {
      "id": "comp1",
      "tournamentId": "tournament1",
      "name": "Épée Senior Men",
      "weapon": "EPEE",
      "category": "Senior Men",
      "maxParticipants": 32,
      "registrationDeadline": "2024-12-14T23:59:59.000Z",
      "status": "REGISTRATION_OPEN",
      "tournament": {
        "id": "tournament1",
        "name": "Copa de Navidad 2024",
        "organizationId": "org123",
        "organization": {
          "id": "org123",
          "name": "Club Esgrima Madrid"
        }
      },
      "participantCount": 18,
      "phaseCount": 0
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### `POST /api/competitions`

Create a new competition within a tournament.

**Request Body:**
```json
{
  "tournamentId": "tournament1",
  "name": "Épée Senior Men",
  "weapon": "EPEE",
  "category": "Senior Men",
  "maxParticipants": 32,
  "registrationDeadline": "2024-12-14T23:59:59.000Z",
  "status": "DRAFT",
  "translations": {
    "en": {
      "name": "Épée Senior Men"
    },
    "fr": {
      "name": "Épée Senior Hommes"
    }
  }
}
```

**Response:** `201 Created` with competition object

**Business Rules:**
- No duplicate weapon+category combinations within same tournament
- Tournament must exist and not be completed/cancelled
- User must have permission to create competitions in the organization

### `GET /api/competitions/{id}`

Get detailed information about a specific competition.

**Response:**
```json
{
  "id": "comp1",
  "tournamentId": "tournament1",
  "name": "Épée Senior Men",
  "weapon": "EPEE",
  "category": "Senior Men",
  // ... other competition fields
  "tournament": {
    "id": "tournament1",
    "name": "Copa de Navidad 2024",
    "organization": {
      "id": "org123",
      "name": "Club Esgrima Madrid"
    }
  },
  "registrations": [
    {
      "id": "reg1",
      "athleteId": "athlete1",
      "registeredAt": "2024-12-01T10:00:00.000Z",
      "athlete": {
        "id": "athlete1",
        "firstName": "Carlos",
        "lastName": "González"
      }
    }
  ],
  "phases": [
    {
      "id": "phase1",
      "name": "Poules",
      "phaseType": "POULE",
      "sequenceOrder": 1,
      "status": "SCHEDULED"
    }
  ],
  "participantCount": 18,
  "phaseCount": 3
}
```

### `PUT /api/competitions/{id}`

Update an existing competition.

**Request Body:** Same structure as POST, but all fields optional

### `DELETE /api/competitions/{id}`

Delete a competition (only if no participants or phases exist).

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error message",
  "details": {
    "field": ["Specific validation error"]
  }
}
```

**Common HTTP Status Codes:**
- `200 OK`: Successful operation
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error or business rule violation
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Authentication & Authorization

### User Roles
- **SYSTEM_ADMIN**: Full access to all tournaments/competitions
- **ORGANIZATION_ADMIN**: Full access within their organization
- **COACH**: Limited access within their organization
- **ATHLETE**: Read-only access to public tournaments + their organization

### Permission Matrix

| Operation | System Admin | Org Admin | Coach | Athlete |
|-----------|--------------|-----------|-------|---------|
| View public tournaments | ✅ | ✅ | ✅ | ✅ |
| View org tournaments | ✅ | ✅ (own org) | ✅ (own org) | ✅ (own org) |
| Create tournament | ✅ | ✅ (own org) | ❌ | ❌ |
| Update tournament | ✅ | ✅ (own org) | ❌ | ❌ |
| Delete tournament | ✅ | ✅ (own org) | ❌ | ❌ |
| Create competition | ✅ | ✅ (own org) | ✅ (own org) | ❌ |
| Update competition | ✅ | ✅ (own org) | ✅ (own org) | ❌ |
| Delete competition | ✅ | ✅ (own org) | ❌ | ❌ |

## Rate Limiting

- **General endpoints**: 100 requests per minute per user
- **Create/Update operations**: 20 requests per minute per user
- **Delete operations**: 10 requests per minute per user

## Legacy Event API Compatibility

The legacy `/api/events` endpoints continue to work for backward compatibility:

### `GET /api/events`
Maps to combined tournament+competition data, presenting each competition as an "event"

### `POST /api/events`
Creates both a tournament and a single competition within it

### `PUT /api/events/{id}`
Updates the competition (and tournament if applicable)

### `DELETE /api/events/{id}`
Deletes the competition (and tournament if it becomes empty)

**Note**: Legacy endpoints are marked as deprecated and will be removed in a future version. New integrations should use the tournament/competition endpoints directly.

## Webhook Events

System emits webhook events for real-time integrations:

- `tournament.created`
- `tournament.updated`
- `tournament.deleted`
- `competition.created`
- `competition.updated`
- `competition.deleted`
- `competition.registration_opened`
- `competition.registration_closed`

## SDKs and Libraries

Official SDKs available for:
- JavaScript/TypeScript
- Python
- PHP
- Java

See individual SDK documentation for usage examples and authentication setup. 