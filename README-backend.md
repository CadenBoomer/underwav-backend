# Underwav — Backend

A Node.js/Express REST API for the Underwav music streaming platform.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Database**: MySQL (mysql2)
- **Authentication**: JWT (jsonwebtoken) + Bcrypt
- **File Uploads**: Multer
- **Email**: Nodemailer
- **Security**: Crypto (token generation)
- **Environment**: dotenv

## Prerequisites

- Node.js v18+
- MySQL 8+
- A `.env` file (see below)

## Getting Started

### 1. Clone the repo and install dependencies

```bash
npm install
```

### 2. Set up the database

Create a MySQL database and run the schema file:

```bash
mysql -u root -p your_database_name < schema.sql
```

### 3. Configure environment variables

Create a `.env` file in the root of the backend folder:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

### 4. Run the server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## API Overview

### Auth — `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register a new user |
| POST | `/login` | Login and receive JWT |
| GET | `/profile` | Get logged-in user profile |
| PATCH | `/profile` | Update profile |
| DELETE | `/profile` | Delete account |
| PATCH | `/avatar` | Upload profile picture |
| PATCH | `/update-password` | Change password |
| POST | `/forgot-password` | Send password reset email |
| GET | `/reset-password/:token` | Show reset form |
| POST | `/reset-password/:token` | Submit new password |
| GET | `/verify-email/:token` | Verify email on signup |
| GET | `/users/:id` | Get public profile |

### Media — `/api/media`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/uploads` | Upload a track |
| GET | `/` | Get logged-in user's tracks |
| PATCH | `/:id` | Edit a track |
| DELETE | `/:id` | Delete a track |
| GET | `/:id/stream` | Stream track (authenticated) |
| GET | `/:id/stream/public` | Stream track (public) |
| GET | `/public/recent` | Recently uploaded tracks |
| GET | `/public/trending-week` | Trending this week |
| GET | `/public/most-viewed` | Most viewed all time |
| GET | `/public/user/:id` | Public tracks by user |
| GET | `/public/user/:id/likes` | Liked tracks by user |
| GET | `/public/genre/:id` | Tracks by genre |
| GET | `/followed` | Tracks from followed artists |
| GET | `/genre-mix` | Tracks matching your genres |

### Comments — `/api/comments`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:mediaId` | Get comments for a track |
| POST | `/:mediaId` | Post a comment |
| DELETE | `/:mediaId/:commentId` | Delete a comment |
| POST | `/like-status` | Get like status for comments |
| POST | `/comment/:id/like` | Like a comment |
| DELETE | `/comment/:id/like` | Unlike a comment |

### Follows — `/api/follows`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/follow/:id` | Follow a user |
| DELETE | `/unfollow/:id` | Unfollow a user |
| GET | `/followers/:id` | Get followers of a user |
| GET | `/following/:id` | Get following of a user |
| GET | `/following` | Get who you follow |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=` | Search tracks and artists |
| GET | `/api/genres` | Get all genres |

## File Storage

Uploaded files are stored locally in the `/uploads` directory:

```
uploads/
  audio/    — audio tracks
  images/   — cover art and avatars
```

## Authentication

Protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Audio stream routes accept the token as a query parameter since browsers can't set headers on native audio requests:

```
/api/media/:id/stream?token=<your_jwt_token>
```
