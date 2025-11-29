🌱 ecoAgent

ecoAgent is an AI-powered platform that helps businesses estimate and analyze carbon emissions across Scope 1, 2, and 3.
It guides users through a simple onboarding flow, computes emissions using backend intelligence, and displays detailed results with intuitive charts.

🚀 Features

1. Multi-step company onboarding form

2. AI-assisted chat for activity inputs

3. Emissions result dashboard:

    Total yearly emissions
  
    Confidence score

    Scope 1/2/3 donut chart

    Top categories

    Expandable category → entity breakdown

4. Modern responsive UI (React + Tailwind)

5. FastAPI backend with PostgreSQL storage

🛠 Tech Stack

Frontend: React + Vite + Tailwind + Recharts
Backend: FastAPI + asyncpg
Database: PostgreSQL (extensions: uuid-ossp, pgcrypto)

📁 Project Structure
frontend/
backend/
  routers/
  services/
