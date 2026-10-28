# ☕ Spring Boot Backend Service — User Management & JWT Authentication

This repository directory contains the **Java 17+ Spring Boot 3 Backend Service** for the **AI Interview Platform**, featuring User Management, BCrypt Password Hashing, JWT Authentication, and PostgreSQL persistence.

---

## 🛠️ Package & Directory Structure

```
backend/
├── pom.xml                                           # Maven dependencies (Spring Security, JPA, Validation, JJWT)
├── .env.example                                      # Environment configuration template
├── README.md                                         # Setup, database, and API documentation
└── src/
    ├── main/
    │   ├── java/com/aiinterview/
    │   │   ├── AiInterviewApplication.java           # Main Spring Boot Entrypoint
    │   │   ├── config/
    │   │   │   ├── CorsConfig.java                   # WebMvc CORS policy for React Frontend
    │   │   │   └── SecurityConfig.java               # Spring Security FilterChain & PasswordEncoder
    │   │   ├── controller/
    │   │   │   ├── AuthController.java               # POST /api/v1/auth/register & POST /api/v1/auth/login
    │   │   │   └── HealthController.java             # GET /api/v1/health
    │   │   ├── dto/
    │   │   │   ├── AuthResponse.java                 # Token & UserDto response payload
    │   │   │   ├── ErrorResponse.java                # Standardized JSON error response
    │   │   │   ├── LoginRequest.java                 # Email & password login payload
    │   │   │   ├── RegisterRequest.java              # Name, email & password register payload
    │   │   │   └── UserDto.java                      # Safe user representation (no password)
    │   │   ├── entity/
    │   │   │   └── User.java                         # JPA Entity for `users` database table
    │   │   ├── exception/
    │   │   │   ├── DuplicateEmailException.java      # Custom exception for email conflicts
    │   │   │   └── GlobalExceptionHandler.java       # Centralized REST exception handler (@ControllerAdvice)
    │   │   ├── repository/
    │   │   │   └── UserRepository.java               # Spring Data JPA repository
    │   │   ├── security/
    │   │   │   ├── CustomUserDetailsService.java     # UserDetailsService loading users by email
    │   │   │   ├── JwtAuthenticationFilter.java      # OncePerRequestFilter for Bearer token authorization
    │   │   │   └── JwtService.java                   # JWT creation, parsing & signature verification
    │   │   └── service/
    │   │       ├── AuthService.java                  # Registration & Login business interface
    │   │       └── impl/
    │   │           └── AuthServiceImpl.java          # Registration, BCrypt hashing, & login implementation
    │   └── resources/
    │       └── application.yml                       # Database connection & JWT secret properties
    └── test/
        └── java/com/aiinterview/
            └── service/
                └── AuthServiceTest.java              # Registration, Hashing, & JWT unit tests
```

---

## ⚙️ 1. Required Environment Variables

Configure your local environment variables using `.env.example`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | Spring Boot HTTP listening port |
| `DB_URL` | `jdbc:postgresql://localhost:5432/ai_interview_db` | PostgreSQL JDBC connection URL |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_PASSWORD` | `postgrespassword` | Database password |
| `JWT_SECRET` | *(required, no default)* | Base64 key that signs login tokens. The app will not start without it. |
| `JWT_EXPIRATION_MS` | `86400000` | Token expiration duration (default 24 hours) |

---

## 🚀 2. How to Run the Backend

```bash
cd backend
mvn spring-boot:run
```

---

## 🔐 3. Authentication & API Endpoints

### 3.1 User Registration (`POST /api/v1/auth/register`)

Registers a new user, hashes the password using **BCrypt**, saves the record to PostgreSQL, and returns a signed JWT token.

#### Request cURL:
```bash
curl -X POST "http://localhost:8080/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "password": "Password123!"
     }'
```

#### Response (HTTP 201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcklkIjoxLCJpYXQiOjE3MD...",
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

---

### 3.2 User Login (`POST /api/v1/auth/login`)

Authenticates user credentials against the BCrypt hashed password and returns a new JWT token.

#### Request cURL:
```bash
curl -X POST "http://localhost:8080/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Password123!"
     }'
```

#### Response (HTTP 200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwidXNlcklkIjoxLCJpYXQiOjE3MD...",
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com"
  }
}
```

---

### 3.3 Accessing Protected Endpoints via JWT

To access protected application endpoints, include the JWT token in the `Authorization` HTTP header:

```http
Authorization: Bearer <your_jwt_token_here>
```

#### Example cURL:
```bash
curl -X GET "http://localhost:8080/api/v1/protected-resource" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

---

## 🔒 4. How JWT Authentication Works

1. **User Login / Registration**: Client posts credentials to `/api/v1/auth/register` or `/api/v1/auth/login`.
2. **Password Verification**: `AuthServiceImpl` verifies password using `BCryptPasswordEncoder.matches()`.
3. **Token Issuance**: `JwtService` creates a signed HMAC-SHA256 JWT containing the user's email (`sub`) and user ID (`userId`).
4. **Token Interception**: For future requests, `JwtAuthenticationFilter` intercepts incoming requests, extracts the `Bearer` token, verifies signature and expiration, loads `UserDetails` from database, and sets Spring Security's `SecurityContext`.

## Password recovery

The login page links to `/forgot-password`. The API accepts
`POST /api/v1/auth/forgot-password` with `{ "email": "you@example.com" }`.
It returns the same acknowledgement for unknown, disabled and active accounts.
`POST /api/v1/auth/reset-password` accepts `{ "token": "...", "password": "..." }`.
Passwords must contain 6–72 characters and fit within BCrypt's 72-byte limit.

Configure `FRONTEND_URL` to the frontend origin (HTTPS in production), plus
`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`,
`MAIL_SMTP_AUTH` and `MAIL_STARTTLS`. Use a verified sender and enable SMTP
authentication and STARTTLS for a production mail provider. Defaults target a
local SMTP catcher on port 1025; they do not deliver real email by themselves.
Docker Compose passes these variables from the root `.env` to the backend.
Its default mail host is `host.docker.internal` for a local SMTP catcher.

Flyway migration V9 stores only the SHA-256 hash of each reset token. Links
expire after 30 minutes, are single-use, and are replaced by a successful new
request. Requests for an account are limited to one per minute. Configure
per-IP request limits at your public reverse proxy as well. SMTP failures are
logged without email addresses or tokens and retain any previously valid link.
Successful resets invalidate previously issued login tokens.

Manual check: start a local SMTP catcher, register an account, request a reset,
open the email link, set a new password, then sign in. Confirm the old password
and the used reset link fail. Repeat with an unknown email to check the same
acknowledgement appears.
