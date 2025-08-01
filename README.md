# Gemma Chat - Full-Stack AI Chat Application

![Gemma Chat Demo](demo.gif)

Gemma Chat is a full-stack chat application powered by the Gemma AI model. It features a sleek dark-themed UI, real-time messaging, and persistent chat history with PostgreSQL for database management.

## Tech Stack

### Frontend
- **React** with **TypeScript**
- **Next.js**
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Icons** for iconography
- **React Markdown** for formatted responses

### Backend
- **Node.js** with **Express**
- **PostgreSQL** for data storage
- **Ollama** for AI inference (Gemma model)
- **Axios** for HTTP requests

## Prerequisites

Before running the application, ensure you have the following installed:

- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Ollama](https://ollama.ai/) (with Gemma3:1b model)

## Setup Instructions

### 1. Set up Ollama

```bash
# Install Ollama in Windows using Powershell
curl https://ollama.com/install.sh -o install.ps1; .\install.ps1

# Pull the Gemma model
ollama pull gemma3:1b
```

### 2. Set up PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres -c "CREATE DATABASE gemma_chat;"

# Create database and user
psql -U postgres -d gemma_chat -f backend/schema.sql
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend (Next.js)
NEXT_PUBLIC_API_BASE=http://localhost:4000/api

# Backend
PORT=4000
DB_USER=postgres
DB_PASSWORD=<Enter your Password Here>
DB_NAME=gemma_chat
```

## Local Run Instructions

### Start the Backend Server

```bash
cd backend
npm install
node index.js
```

### Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Now, you can start chatting with the bot by navigating to http://localhost:3000 in your browser.

## Project Structure

```
GemmaChatBot/
├── frontend/           # Next.js application
│   ├── components/     # React components
│   ├── pages/          # Application routes
│   ├── styles/         # Global CSS
│   ├── public/         # Favicon
│   └── .env.local      # Backend API endpoint
├── server/             # Express backend server
│   ├── controllers/    # API controllers
│   ├── routes/         # API routes
│   ├── db              # Database connection
│   ├── index.js        # Backend entry point
|   ├── schema.sql      # Database Tables Initiation   
|   └── .env            # Environment variables
└── README.md           # You're here
```

## Key Features

- Real-time streaming chat responses
- Persistent chat history with PostgreSQL
- Sleek dark-themed UI with smooth animations
- Searchable chat history
- Editable chat titles
- Chat deletion functionality
- Collapsable Sidebar

## Assumptions and Constraints

1. **Ollama Requirement**:
   - The application requires Ollama running locally with the Gemma3:1b model

2. **Database**:
   - Requires PostgreSQL with proper schema setup
   - Assumes local PostgreSQL instance by default

3. **Authentication**:
   - Currently implements a simple authentication-free approach which is not suitable for production

4. **Scalability**:
   - Designed for single-user or small-scale usage
   - Not optimized for high-concurrency environments

5. **Browser Support**:
   - Optimized for modern browsers (Chrome, Firefox, Safari latest)
   - Limited support for IE11 and older browsers

6. **Rate Limiting**:
   - No rate limiting implemented for API endpoints
   - Production deployment would require additional protections

## Future Improvements

- Add user authentication
- Add support for multiple AI models
- Implement rate limiting for API endpoints
- Add message editing capability
- Implement conversation export (PDF, text)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
