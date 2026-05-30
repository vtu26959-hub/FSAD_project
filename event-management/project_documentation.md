# EventSphere - Detailed Project Documentation

## 1. Overview

**EventSphere** is a full-stack, enterprise-grade Event Management and Ticketing platform. It allows users to browse campus events by department and category, securely book tickets with real-time concurrency control, receive digital QR tickets via email, and interact with a smart assistant to discover events. 

The platform features a premium, responsive dark-themed UI with glassmorphism elements and smooth micro-animations.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 (via Vite 8)
- **Styling**: Vanilla CSS utilizing CSS Variables for global theming, CSS Grid/Flexbox for layouts, and custom animations/glassmorphism effects.
- **Networking**: Axios for REST API communication.
- **Routing**: Custom state-based SPA routing (No external libraries like React Router used).

### Backend
- **Framework**: Java 17, Spring Boot 3.2.5
- **Data Access**: Spring Data JPA / Hibernate
- **Database**: MySQL (Relational DB)
- **Email**: `spring-boot-starter-mail` (JavaMailSender)
- **QR Code Generation**: `ZXing` (Zebra Crossing) core/javase libraries

---

## 3. Core Features & Functions

- **Smart Event Assistant**: A built-in, rule-based AI chatbot widget that uses regex and keyword matching to help users dynamically filter events by price, popularity, availability, and department.
- **Real-Time Ticket Locking**: A concurrency control system that temporarily "locks" tickets for 60 seconds when a user initiates a booking, preventing double-booking of the same seat.
- **Digital QR Ticketing**: Generates base64-encoded QR codes containing a direct URL. When scanned via mobile, it instantly routes the user to a secure Digital Ticket Verification page.
- **Asynchronous Email Dispatch**: Automatically sends rich HTML confirmation emails with embedded ticket details in a background thread (`@Async`), ensuring the user's booking flow isn't slowed down by network latency.
- **Admin Dashboard**: Role-based access control allowing `ADMIN` users to create new events, assign them to departments, and set ticket capacities.

---

## 4. Architecture

### Database Entities (MySQL mapped via JPA)
1. **User**: Handles authentication and roles (`USER`, `ADMIN`).
2. **Event**: Stores event details (name, category, department, date, ticket price, capacities, popularity).
3. **Booking**: Links `User` and `Event`, storing transaction details and generating a unique alphanumeric `bookingId`.

### Backend Controllers (Spring Boot)
- `AuthController`: User registration and authentication.
- `EventController`: Retrieving, filtering, and creating events. Dedicated endpoint for fetching secure ticket data for QR verification.
- `BookingController`: Core transaction management including `/lock`, `/unlock`, and `/book`.

### Frontend Architecture
- **State Management**: Centralized view state orchestrating navigation natively.
- **EventAssistant.jsx**: Floating chat widget with an in-memory keyword-based query engine.
- **TicketVerification.jsx**: "Digital Pass" UI displaying visually verified ticket states.
- **BookingFlow**: Implements a visual SVG ring countdown integrating with the backend ticket lock mechanism.

---

## 5. System Workflows

> [!NOTE]
> **The Booking & Locking Flow**
> 1. User selects tickets and initiates a "Book" action.
> 2. Frontend hits `/api/bookings/lock`. Backend checks availability and locks tickets temporarily in a `ConcurrentHashMap`.
> 3. Frontend starts a 60-second visual countdown.
> 4. User confirms the transaction. Backend validates the lock, creates the DB record, deducts tickets, generates QR code, and triggers async email.
> 5. Frontend receives the QR Code and shows the summary success screen.

> [!TIP]
> **The Verification Flow**
> 1. Security scans the QR code at the venue.
> 2. The QR code resolves to the frontend verification URL (e.g. `/verify/BKG-ABCD`).
> 3. The React app intercepts the path, bypasses login constraints, and mounts the `TicketVerification` component.
> 4. The app retrieves ticket integrity from the backend and visually displays the verification status.

---

## 6. Local Setup Instructions

### Prerequisites
- Java 17
- Node.js & npm
- MySQL Server

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Update `application.properties` with your MySQL credentials and SMTP email settings.
3. Build the project: `./mvnw clean install` (or standard maven commands).
4. Run the application: `./mvnw spring-boot:run`
5. The API will start on `http://localhost:8080`.

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. The application will be available at the URL provided by Vite (usually `http://localhost:5173`).
