# Enguardia - Fencing Tournament Management System

A comprehensive web application for managing fencing tournaments, built with Next.js 15, Prisma, and NextAuth.js.

## Overview

Enguardia uses a modern **Tournament > Competition > Phase** architecture that accurately reflects how real fencing tournaments are organized:

- **Tournament**: Overall event container (e.g., "Copa de Navidad 2024")
- **Competition**: Specific weapon+category combinations (e.g., "Épée Senior Men")  
- **Phase**: Competition stages (Poules, Direct Elimination, Classification)

This allows tournaments to run multiple weapon categories simultaneously, just like real-world fencing events.

## Features

### Multi-Tenant Architecture
- **Organizations**: Each fencing club/federation operates independently
- **Role-based Access**: System Admin, Organization Admin, Coach, Athlete roles
- **Multi-language Support**: Full internationalization with translations

### Tournament Management
- **Hierarchical Structure**: Tournament → Competition → Phase organization
- **Active Tournament Logic**: Only one active tournament per organization
- **Public/Private Tournaments**: Control visibility and access
- **Real-time Status Tracking**: Draft, Registration, In Progress, Completed

### Competition Features
- **Multi-Weapon Support**: Épée, Foil, Sabre in same tournament
- **Category Management**: Age groups, skill levels, gender categories
- **Registration Management**: Per-competition participant limits and deadlines
- **Phase Progression**: Automated poule → elimination → classification

### User Authentication & Security
- **NextAuth.js Integration**: Secure authentication with multiple providers
- **Session Management**: Persistent login state with proper token handling
- **Authorization Controls**: Fine-grained permissions per operation

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js with session management
- **Validation**: Zod schemas with comprehensive business rules
- **Internationalization**: Multi-language support built-in

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- SQLite (included) or PostgreSQL

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd enguardia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file with:
   ```env
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   
   # Database
   DATABASE_URL="file:./dev.db"
   
   # OAuth Providers (optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed  # Optional: seed with sample data
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
enguardia/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── tournaments/   # Tournament management
│   │   │   ├── competitions/  # Competition management
│   │   │   └── events/        # Legacy Event API (backward compatibility)
│   │   ├── tournaments/       # Tournament pages
│   │   ├── events/           # Event management pages
│   │   └── auth/             # Authentication pages
│   ├── components/            # React components
│   │   ├── tournaments/      # Tournament UI components
│   │   ├── events/           # Event UI components (legacy)
│   │   └── ui/               # Shared UI components
│   ├── lib/                  # Shared utilities
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── prisma.ts        # Database client
│   │   └── validation.ts    # Zod schemas
│   └── types/               # TypeScript type definitions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── docs/                    # Documentation
│   ├── tournament-architecture.md
│   └── api-reference.md
└── public/                  # Static assets
```

## API Documentation

The application provides comprehensive REST APIs for tournament and competition management:

### Tournament Endpoints
- `GET /api/tournaments` - List tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/{id}` - Get tournament details
- `PUT /api/tournaments/{id}` - Update tournament
- `DELETE /api/tournaments/{id}` - Delete tournament

### Competition Endpoints  
- `GET /api/competitions` - List competitions
- `POST /api/competitions` - Create competition
- `GET /api/competitions/{id}` - Get competition details
- `PUT /api/competitions/{id}` - Update competition
- `DELETE /api/competitions/{id}` - Delete competition

### Legacy Event API (Backward Compatibility)
- `GET /api/events` - Maps to tournament/competition data
- `POST /api/events` - Creates tournament + competition
- All existing event operations supported

See [API Reference](docs/api-reference.md) for detailed documentation.

## Architecture Documentation

For detailed information about the tournament architecture, data model, and business rules, see:

- [Tournament Architecture Guide](docs/tournament-architecture.md)
- [API Reference](docs/api-reference.md)

## Database Schema

The system uses a hierarchical data model:

```
Organization (Tenant)
└── Tournament (Event Container)
    └── Competition (Weapon + Category)
        └── Phase (Poules, Elimination, etc.)
            ├── Poule (Round-robin pools)
            └── Bracket (Direct elimination)
```

Key entities:
- **Tournament**: Event container with dates, venue, organization
- **Competition**: Weapon+category combinations within tournaments
- **Phase**: Competition stages (poules, elimination, classification)
- **Registration**: Links athletes to competitions
- **Bout**: Individual matches within poules or brackets

## Development

### Database Migrations
```bash
npx prisma migrate dev --name "description"
npx prisma generate
```

### Type Generation
```bash
npm run type-check
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

### Testing
```bash
npm run test
npm run test:watch
```

## Deployment

### Production Environment
1. Set up PostgreSQL database
2. Configure production environment variables
3. Run production build:
   ```bash
   npm run build
   npm start
   ```

### Vercel Deployment
The easiest deployment option is Vercel:

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for other platforms.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
