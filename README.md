# ETF Portfolio Manager & Backtester

A comprehensive full-stack application for tracking investment portfolios and backtesting ETF strategies on historical data. Built with modern web technologies for performance and user experience.

![Project Screenshot](https://raw.githubusercontent.com/mattiafurini/portfolio_app/main/screenshot.png) *Add a screenshot here if available*

## Features

### 1. Portfolio Management
*   **dashboard**: Real-time overview of your potential wealth.
*   **Multi-Portfolio Support**: Create and manage multiple distinct portfolios (e.g., "Retirement", "Speculative").
*   **Transaction Logging**: Record Buys, Sells, and monitor average buy price.
*   **Performance Metrics**: Track Total Invested, Current Value, ROI (%), and Profit/Loss.
*   **Visual Charts**: Interactive charts visualizing portfolio growth and asset allocation.

### 2. Historical Backtesting simulator
*   **Strategy Simulation**: Test investment strategies (Lump Sum directly or via DCA) on real historical market data.
*   **Interactive Search**: "Smart Search" for ETFs and assets via Yahoo Finance API.
*   **Dynamic Charts**: Visualize proper growth over time with accurate time-scaling.
*   **Financial Metrics**: Calculate CAGR (Compound Annual Growth Rate), total return, and final portfolio value.
*   **Auto-Configuration**: Automatically detects asset inception dates to prevent invalid simulation ranges.

### 3. Data & Privacy
*   **Privacy-Focused**: Self-hosted architecture.
*   **Data Sources**: Real-time prices and historical data fetched via Yahoo Finance.
*   **Import/Export**: Bulk import transactions via Excel/CSV.

## Tech Stack

### Frontend
*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS, Lucide React (Icons)
*   **Charts**: Recharts
*   **State**: React Hooks & Context API

### Backend
*   **Framework**: [NestJS](https://nestjs.com/)
*   **Language**: TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **External API**: `yahoo-finance2` for market data

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   Docker (for PostgreSQL) or a local PostgreSQL instance

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/mattiafurini/portfolio_app.git
    cd portfolio_app
    ```

2.  **Setup the Database**
    ```bash
    # Start Postgres (example using Docker)
    docker run --name portfolio-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=portfolio -p 5432:5432 -d postgres
    ```

3.  **Configure Backend**
    ```bash
    cd backend
    cp .env.example .env
    # Edit .env and set DATABASE_URL="postgresql://postgres:password@localhost:5432/portfolio?schema=public"
    
    npm install
    npx prisma migrate dev  # Initialize DB schema
    npm run start:dev       # Start backend on http://localhost:3001
    ```

4.  **Configure Frontend**
    ```bash
    cd ../frontend
    cp .env.local.example .env.local
    # Edit .env.local and set NEXT_PUBLIC_API_URL="http://localhost:3001/api"
    
    npm install
    npm run dev             # Start frontend on http://localhost:3000
    ```

## Deployment

The application is container-ready and can be deployed to any VPS (like Azure VM, AWS EC2, DigitalOcean) using `pm2` or Docker Compose.

---

Made by [Mattia Furini](https://github.com/mattiafurini)
