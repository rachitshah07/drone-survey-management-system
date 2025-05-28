# AeroSurvey - Drone Survey Management System
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3-green.svg)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://www.postgresql.org/)

A comprehensive drone survey management platform designed for enterprise-scale operations. This system enables large organizations to plan, manage, and monitor autonomous drone surveys across multiple global sites, focusing on mission management, real-time monitoring, fleet coordination, and survey reporting.

## 🚁 Project Overview

**FlytBase Assignment:** Drone Survey Management System Design Challenge

AeroSurvey Pro revolutionizes how companies inspect, monitor, and map their facilities by providing a scalable platform that simplifies key operations like facility inspections, security patrols, and site mapping through intelligent drone mission coordination.

### 🎯 Key Objectives
- **Mission Management**: Comprehensive planning and execution of drone survey missions
- **Fleet Coordination**: Real-time monitoring and control of drone fleets
- **Scalable Operations**: Support for multiple concurrent missions across different locations
- **Enterprise Security**: Role-based access control for organizational use
- **Real-Time Monitoring**: Live mission progress tracking and control capabilities

## ✨ Features

### 🎮 Mission Planning and Configuration System
- **Interactive Survey Area Definition**: Map-based polygon drawing with React Leaflet
- **Automated Flight Path Generation**: Crosshatch and grid patterns for optimal coverage
- **Configurable Parameters**: Flight altitude (10-120m), speed (1-15 m/s), overlap percentage (50-90%)
- **Waypoint Management**: Automated takeoff, survey, and landing waypoint generation
- **Mission Validation**: Pre-flight checks and parameter validation

### 📊 Fleet Visualization and Management Dashboard
- **Real-Time Fleet Overview**: Organization-wide drone inventory with live status updates
- **Drone Status Monitoring**: Available, in-mission, maintenance, and offline status tracking
- **Battery Level Monitoring**: Color-coded battery indicators with maintenance alerts
- **Location Tracking**: GPS coordinates and last-seen timestamps
- **Administrative Controls**: Add, edit, and remove drones (Admin only)

### 🗺️ Real-Time Mission Monitoring Interface
- **Live Mission Tracking**: Interactive map with survey area and progress visualization
- **Mission Control Actions**: Start, pause, resume, and abort mission capabilities
- **Progress Monitoring**: Real-time percentage completion and ETA calculations
- **Telemetry Dashboard**: Battery levels, GPS signal strength, and connection status
- **Status Updates**: Live mission state transitions and notifications

### 📈 Survey Reporting and Analytics Portal
- **Comprehensive Analytics**: Mission type distribution and completion statistics
- **Fleet Performance Metrics**: Total flight hours, utilization rates, and efficiency analysis
- **Mission Summaries**: Duration, distance, coverage area, and success rates
- **Interactive Visualizations**: Charts and graphs using Recharts library
- **Historical Data**: Mission history with filtering and search capabilities

### 🔐 Authentication and Security
- **JWT-Based Authentication**: Secure token-based user authentication
- **Role-Based Access Control**: Admin and Operator role separation
- **Rate Limiting**: User-based API throttling (200 requests/hour)
- **Input Validation**: Comprehensive client and server-side validation
- **CORS Configuration**: Secure cross-origin resource sharing

### 📱 User Experience Features
- **Responsive Design**: Mobile-first approach supporting desktop, tablet, and mobile
- **Real-Time Notifications**: Toast notifications for user actions and system events
- **Loading States**: Progress indicators for all async operations
- **Error Handling**: User-friendly error messages with recovery suggestions
- **Smart Polling**: Intelligent data refresh with exponential backoff

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **React Router 6**: Client-side routing with protected routes
- **React Leaflet**: Interactive mapping for mission visualization
- **Recharts**: Data visualization for analytics dashboard
- **Axios**: HTTP client with interceptors for API communication
- **React Toastify**: User notifications and feedback

### Backend
- **Flask**: Lightweight Python web framework
- **Flask-SQLAlchemy**: Database ORM with relationship management
- **Flask-JWT-Extended**: JWT authentication and authorization
- **Flask-CORS**: Cross-origin resource sharing configuration
- **Flask-Limiter**: Rate limiting and request throttling
- **PostgreSQL**: Primary database with JSON support

### Development Tools
- **Git**: Version control with conventional commit messages
- **ESLint & Prettier**: Code quality and formatting
- **Alembic**: Database migration management
- **bcrypt**: Password hashing and verification

## 📋 Prerequisites

- **Python 3.9+**
- **Node.js 16+**
- **PostgreSQL 13+**
- **Git**

## 📁 Project Structure
```
drone-survey-management-system/
├── backend/
│ ├── app.py # Flask application factory
│ ├── config.py # Configuration settings
│ ├── models/ # Database models
│ │ ├── init.py
│ │ ├── user.py
│ │ ├── drone.py
│ │ └── mission.py
│ ├── routes/ # API endpoints
│ │ ├── init.py
│ │ ├── auth.py
│ │ ├── drones.py
│ │ └── missions.py
│ ├── utils/ # Utility functions
│ │ ├── init.py
│ │ └── auth.py
│ ├── migrations/ # Database migrations
│ └── requirements.txt # Python dependencies
├── frontend/
│ ├── public/
│ ├── src/
│ │ ├── components/ # React components
│ │ │ ├── Dashboard.js
│ │ │ ├── FleetManager.js
│ │ │ ├── MissionPlanner.js
│ │ │ ├── MissionMonitor.js
│ │ │ ├── ProtectedRoute.js
│ │ │ └── Login.js
│ │ ├── services/ # API services
│ │ │ └── api.js
│ │ ├── App.js
│ │ ├── App.css
│ │ └── index.js
│ └── package.json # Node.js dependencies
├── README.md
└── .gitignore
```

## 🚀 Installation Guide

### 1. Clone Repository

git clone https://github.com/rachitshah07/drone-survey-management-system.git
cd drone-survey-management-system


### 2. Database Setup

#### Install PostgreSQL
* Ubuntu/Debian
    ```bash
    sudo apt update
    sudo apt install postgresql postgresql-contrib
    ```

* macOS (using Homebrew)
    ```bash
    brew install postgresql
    brew services start postgresql
    ```

*   Windows
    ```bash
    Download and install from https://www.postgresql.org/download/windows/
    ```

* Connect to PostgreSQL
    ```bash
    CREATE DATABASE drone_survey_db;
    CREATE USER drone_survey_user WITH PASSWORD 'your_secure_password';
    GRANT ALL PRIVILEGES ON DATABASE drone_survey_db TO drone_survey_user;
    \q
    ```

### 3. Backend Setup

* Navigate to backend directory
    ```bash
    cd backend
    ```
* Create virtual environment
    ```bash
    python -m venv env
    ```
* Activate virtual environment
    * Linux/macOS:
        ```bash
        source env/bin/activate
        ```

    * Windows:
        ```bash
        env\Scripts\activate
        ```
* Install dependencies
    ```bash
    pip install -r requirements.txt
    ```
#### Configure Environment Variables (.env)
```bash
DATABASE_URL=postgresql://aerosurvey_user:your_secure_password@localhost/aerosurvey_pro
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
```


#### Initialize Database
```bash
flask db init
flask db migrate -m "Initial migration with User, Drone, and Mission models"
flask db upgrade
```


#### Run Backend Server
```bash
python app.py
```

* Backend will be available at `http://localhost:5000`


### 4. Frontend Setup
* Navigate to frontend directory (new terminal)
    ```bash
    cd frontend
    ```
* Install dependencies
    ```bash
    npm install
    ```
#### Configure Environment Variables (.env)
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APP_NAME=AeroSurvey
```


#### Run Frontend Development Server
```bash
npm start
```
* Frontend will be available at `http://localhost:3000`

## 🔧 Development Setup

### Backend Development
* Install development dependencies
    ```bash
    pip install -r requirements-dev.txt
    ```



## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile

### Fleet Management
- `GET /api/drones` - Get all drones
- `POST /api/drones` - Create drone (Admin only)
- `PUT /api/drones/{id}` - Update drone (Admin only)
- `DELETE /api/drones/{id}` - Delete drone (Admin only)
- `GET /api/drones/stats` - Get fleet statistics

### Mission Management
- `GET /api/missions` - Get all missions
- `POST /api/missions` - Create mission
- `GET /api/missions/{id}` - Get mission details
- `POST /api/missions/{id}/start` - Start mission
- `POST /api/missions/{id}/pause` - Pause mission
- `POST /api/missions/{id}/resume` - Resume mission
- `POST /api/missions/{id}/abort` - Abort mission
- `PUT /api/missions/{id}/progress` - Update progress

### System Health
- `GET /api/health` - Health check

## 👥 User Roles

### Admin
- Full access to all features
- Drone fleet management (add, edit, delete)
- User management
- Mission control and monitoring
- Analytics and reporting

### Operator
- Mission planning and execution
- Fleet viewing (read-only)
- Mission monitoring
- Analytics and reporting

## 🔒 Default Credentials

**Admin User:**
- Email: `admin@aerosurvey.com`
- Password: `admin123`

**Operator User:**
- Email: `operator@aerosurvey.com`
- Password: `operator123`



## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Contact

**Developer**: Rachit Shah  
**Email**: rachitshah1525@gmail.com  
**GitHub**: [@rachitshah07](https://github.com/rachitshah07)  

---

**Demonstrating craftsmanship over mere completion**

Happy Coding!
