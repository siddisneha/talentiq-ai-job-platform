# Job Portal FastAPI Backend

FastAPI backend for a dynamic job portal with user accounts, job aggregation, dashboards, saved jobs, applications, alerts, analytics, recommendations, and resume/job matching.

## Phase 1 Foundation Scope

This backend covers the SOP foundation setup:

- Database schema for users, jobs, job sources, applications, saved jobs, alerts, and analytics logs.
- JWT authentication for register/login and protected dashboard workflows.
- CRUD APIs for jobs, users, job sources, saved jobs, applications, alerts, and activity logs.
- Job data ingestion through bulk import, external API import, and configurable BeautifulSoup scraping.
- SQLite for local development and PostgreSQL-ready configuration for deployment.

## Tech Stack

- FastAPI
- SQLAlchemy
- SQLite for local development
- PostgreSQL-ready deployment support
- JWT authentication
- Pydantic settings
- BeautifulSoup and Requests for job-source ingestion

## Run Locally

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open:

- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Website: http://127.0.0.1:5173

## Default Flow

1. Register a user.
2. Login to get an access token.
3. Candidate accounts browse jobs, save jobs, apply, track status, and create alerts.
4. Employer accounts post jobs, import public jobs, and view applicants for their posted jobs.
5. Use the token in Swagger docs with the `Authorize` button for API testing.
6. Track activity, create alerts, and view dashboard/analytics summaries.

## Main API Areas

- `POST /api/auth/register` and `POST /api/auth/login` for accounts and JWT auth.
- `GET /api/jobs` for search/filter by role, location, skill, job type, and salary.
- `POST /api/job-sources` for registering company sites, APIs, or scraper sources.
- `POST /api/ingestion/jobs/bulk` for importing postings collected from APIs or scrapers.
- `POST /api/ingestion/external-api` for importing JSON job feeds.
- `POST /api/ingestion/providers/remotive` for importing public Remotive remote jobs.
- `POST /api/ingestion/providers/arbeitnow` for importing public Arbeitnow jobs.
- `POST /api/ingestion/scrape` for importing HTML job pages with CSS selectors.
- `POST /api/saved-jobs/{job_id}` and `POST /api/applications` for dashboard workflows.
- `GET /api/applications/employer` for employers to view candidates who applied to their posted jobs.
- `POST /api/alerts` and `GET /api/alerts/{alert_id}/matches` for personalized job alerts.
- `GET /api/recommendations` for profile-based recommendations.
- `POST /api/recommendations/resume-match` for simple resume skill extraction and matching.
- `POST /api/activity` and `GET /api/analytics/summary` for user behavior and market insights.

## Seed Data

```powershell
.\.venv\Scripts\python.exe -m app.seed
```

Sample jobs are disabled so the candidate portal shows real imported jobs and employer-posted jobs.
Use the employer **Post Jobs** screen to import public jobs from supported providers.

## Real Job Imports

Employer and admin accounts can import public job listings from the **Post Jobs** screen.
The current provider imports are:

- Remotive remote jobs: `POST /api/ingestion/providers/remotive`
- Arbeitnow jobs: `POST /api/ingestion/providers/arbeitnow`

Example body:

```json
{
  "query": "python",
  "limit": 25
}
```

Imported jobs keep the original `source_url` and `source_name` so candidates can open the source posting.

## Application Behavior

For jobs posted directly by an employer inside this portal, the candidate's profile, resume URL,
cover letter, and application status are stored in the employer's applicant inbox.

For external imported jobs, the portal keeps the source posting link. Candidates can open the
original posting and also record the application in their tracker.

## Deployment Prep

The backend includes Render-ready files:

- `render.yaml`
- `Procfile`
- PostgreSQL driver in `requirements.txt`

For Render, create a web service from the GitHub repository and use the included `render.yaml`. Render will create a PostgreSQL database and provide `DATABASE_URL` automatically.
