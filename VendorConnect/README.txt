HOW TO RUN
1. Install Node.js (once).
2. Open a terminal in this folder and run:   npm install     (first time only)
3. Start the app:                            npm start
4. Open http://localhost:5000 in your browser.

Do NOT open the HTML files directly or with Live Server.
The website and the backend both run from this one server.

Data is saved in vendorconnect.db. Product pictures are saved in the uploads/ folder.

DEPLOY ON RENDER
1. Push this folder to a GitHub repository.
2. Render > New > Web Service > pick the repo.
   Build command: npm install      Start command: npm start
3. Choose a paid instance (Starter) and add a Disk:
   Mount path: /var/data     Size: 1 GB
4. Add an environment variable:  DATA_DIR = /var/data
5. Deploy, then open the .onrender.com address Render gives you.
Without the disk, the database and pictures are erased on every redeploy.
