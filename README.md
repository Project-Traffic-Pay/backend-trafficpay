# TrafficPay - Digital Traffic Fine Payment System

![TrafficPay Illustration](frontend-web/public/illustration.png)

Welcome to the **TrafficPay** repository! This is a digital traffic fine payment system developed for the Sri Lanka Police Department as part of a Group Project for Software Architecture at the University of Ruhuna.

## Project Structure

This project follows a microservices-inspired architecture with distinct components:

- **`backend/`**: Node.js & Express API providing services for the frontend and mobile applications.
- **`frontend-web/`**: React-based web application for officers and administrators.
- **`mobile-app/`**: React Native mobile application for drivers to view and pay their traffic fines.
- **`schema.sql`**: Database schema for setting up the necessary tables.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (LTS recommended)
- A suitable database system as per the configuration (refer to `schema.sql`)

## Getting Started

To get the project up and running locally, follow these steps:

1. **Install Dependencies**
   Navigate to the root directory and install dependencies (this might require installing dependencies in each subdirectory as well, depending on your setup).
   ```bash
   npm install
   ```

2. **Run the Development Servers**
   You can start the backend, frontend web app, and mobile app concurrently from the root directory using:
   ```bash
   npm run dev
   ```

   Alternatively, you can run individual services:
   - Backend: `npm run backend:dev`
   - Frontend: `npm run frontend`
   - Mobile: `npm run mobile`

## Technologies Used

- **Backend**: Node.js, Express
- **Frontend Web**: React
- **Mobile App**: React Native
- **Database**: Supabase PostgreSQL (see `schema.sql`)

## License

This project is licensed under the ISC License.
