# Overview

This is an Angular 19 kiosk application for residential access control. The system validates visitor QR codes, processes identification documents (INE/driver's license) using OCR, and controls physical gate access via GPIO. It's designed for a 7-inch touchscreen display in landscape orientation (1024x600) and operates in full-screen kiosk mode without scrollbars or external input devices.

The application uses a state machine pattern to guide users through three main screens: QR code validation, ID verification, and access authorization. The backend provides REST APIs for QR validation, OCR processing, and GPIO control (currently mocked for development).

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: Angular 19 with standalone components (no NgModules)
- **Component Structure**: Single-page application using Angular Router
  - `AppComponent`: Root component with shared header
  - `KioskComponent`: Main state machine controller managing three screens
  - State transitions handled via TypeScript enums and conditional rendering
- **UI Library**: Shadcn-style components built with Radix UI primitives (imported but not actively used in kiosk screens)
- **Styling**: Custom CSS optimized for 7-inch touchscreen with large touch targets and typography
- **Build Tool**: Vite with Angular plugin (@analogjs/vite-plugin-angular)
- **Camera Integration**: Uses browser MediaDevices API for QR scanning via webcam
- **QR Detection**: jsQR library for client-side QR code detection from video stream
- **HTTP Integration**: AccessService (`client/src/app/services/access.service.ts`) connects to backend APIs
  - `validateQr(uuid)`: Validates scanned QR codes
  - `processIne(imageBase64)`: Sends ID image for OCR processing
  - `openGate(curp, gateId)`: Triggers gate opening after validation

**Design Decisions**:
- Chose standalone components for Angular 19 to reduce boilerplate and improve tree-shaking
- No scroll on main viewport; modals use internal scrolling when needed
- Large fonts (32px+ for titles) and buttons for touchscreen usability at 50-70cm distance
- State machine pattern prevents navigation errors and ensures linear flow

## Backend Architecture

**Framework**: Express.js with TypeScript
- **Server Structure**: 
  - `server/index.ts`: Express app initialization with JSON body parsing and request logging
  - `server/routes.ts`: REST API endpoints for access control operations
  - `server/static.ts`: Serves built Angular application as SPA
  - `server/vite.ts`: Vite development middleware for HMR during development
- **API Endpoints**:
  - `POST /api/access/validate-qr`: Validates QR codes and returns visitor data
  - `POST /api/access/process-ine`: OCR processing of identification documents
  - `POST /api/access/open-gate`: Triggers GPIO to open physical gates
- **Service Layer** (`server/services/`):
  - `qr.service.ts`: QR validation with mock visitors database, ready for PostgreSQL integration
  - `ocr.service.ts`: INE/License OCR processing with confidence scores, structured for AWS Textract/Google Vision/Azure integration
  - `gpio.service.ts`: GPIO control for Raspberry Pi relays with access logging (mock in development, auto-detects Raspberry Pi)
- **Additional Endpoints**:
  - `GET /api/access/log`: Access audit log for administration
  - `GET /api/health`: Service health check endpoint
- **CORS**: Enabled for all origins during development
- **Build Process**: esbuild bundles server code with allowlisted dependencies for faster cold starts

**Design Decisions**:
- Express chosen for simplicity and broad ecosystem compatibility
- Service layer separation allows easy swapping of mock implementations with real integrations
- GPIO service structured for Raspberry Pi but works as mock on any platform
- Request logging middleware for debugging and audit trails

## Data Storage

**Current Implementation**: In-memory storage using TypeScript Maps
- `storage.ts`: MemStorage class implementing IStorage interface for user management
- No database currently connected

**Schema Definition**: Drizzle ORM with PostgreSQL dialect
- `shared/schema.ts`: Defines users table with Zod validation
- Drizzle configured to use PostgreSQL (connection string expected in `DATABASE_URL`)
- Migration output directory: `./migrations`

**Design Decisions**:
- Drizzle chosen for type-safe queries and easy migrations
- IStorage interface allows swapping storage implementations without changing business logic
- Schema defined in shared directory for use by both client and server
- Currently using mock data structures in services (qr, ocr, gpio) instead of database

## External Dependencies

**Third-Party Services (Planned Integration)**:
- **OCR Services**: Structured for AWS Textract, Google Cloud Vision, or Azure Computer Vision
  - Current: Mock INE data responses
  - Future: Real-time document scanning with confidence scores and fraud detection
- **CURP Validation**: Placeholder for RENAPO (Mexican national registry) API integration
- **Hardware Integration**:
  - GPIO control via `onoff` library (for Raspberry Pi deployment)
  - Relay modules for physical gate/turnstile control
  - Magnetic sensors for door state monitoring

**Development Tools**:
- **Vite**: Frontend build tool and dev server
- **esbuild**: Server bundler for production builds
- **TypeScript**: Type safety across full stack
- **Drizzle Kit**: Database migrations and schema management

**UI Components**:
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first styling (configured but minimal usage in kiosk screens)
- **Lucide Icons**: Icon library

**Key Libraries**:
- **jsQR**: Client-side QR code detection from video streams
- **Zone.js**: Required for Angular change detection
- **CORS**: Cross-origin resource sharing for API access

**Design Decisions**:
- OCR service abstracted to support multiple providers without code changes
- GPIO service designed with safety features (watchdog timers, timeout protection)
- Mock implementations allow full development/testing without hardware or paid APIs
- Service interfaces designed for easy production integration