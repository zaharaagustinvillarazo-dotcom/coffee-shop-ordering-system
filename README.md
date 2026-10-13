[README.md](https://github.com/user-attachments/files/33380108/README.md)
# ☕ Offline Coffee Shop Ordering System

A simple Point-of-Sale (POS) system for a small coffee shop. Runs completely
offline on one computer using Node.js + Express (backend) and MySQL through
XAMPP (database).

---

## 1. Project Folder Structure

```
coffee-shop-ordering-system/
│
├── backend/                    <- Node.js / Express server
│   ├── server.js                (starting point of the app)
│   ├── package.json             (list of required packages)
│   ├── config/
│   │   ├── db.js                (connects to MySQL)
│   │   └── password.js          (hashes/checks passwords)
│   ├── controllers/             (the actual logic for each feature)
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── salesController.js
│   ├── middleware/
│   │   └── auth.js              (checks who is logged in)
│   └── routes/                  (defines the URLs / API endpoints)
│       ├── authRoutes.js
│       ├── productRoutes.js
│       ├── orderRoutes.js
│       └── salesRoutes.js
│
├── frontend/                    <- What staff see in the browser
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html           (admin only)
│   ├── products.html            (admin only - manage menu)
│   ├── orders.html               (POS screen - staff + admin)
│   ├── sales.html                (admin only - sales records)
│   ├── css/style.css
│   └── js/
│       ├── common.js             (shared helper functions)
│       ├── login.js
│       ├── dashboard.js
│       ├── products.js
│       ├── orders.js
│       └── sales.js
│
├── database/
│   └── coffee_shop_db.sql       (run this in phpMyAdmin first)
│
└── README.md                    (this file)
```

---

## 2. Required Software

1. **XAMPP** (for MySQL + phpMyAdmin) — https://www.apachefriends.org/
2. **Node.js** (version 18 or newer) — https://nodejs.org/

---

## 3. Step-by-Step Setup

### Step A — Set up the database

1. Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Open your browser and go to `http://localhost/phpmyadmin`.
3. Click the **SQL** tab at the top.
4. Open the file `database/coffee_shop_db.sql` from this project, copy
   **all of its content**, paste it into the SQL box in phpMyAdmin, and
   click **Go**.
5. This creates the `coffee_shop_db` database, all 4 tables, 2 starter
   staff accounts, and some sample menu items automatically.

> If your MySQL root user has a password (most default XAMPP setups don't),
> open `backend/config/db.js` and put your password inside the quotes
> next to `password: ''`.

### Step B — Install the backend

1. Open a terminal / command prompt.
2. Go into the `backend` folder:
   ```
   cd coffee-shop-ordering-system/backend
   ```
3. Install the required packages:
   ```
   npm install
   ```
   This downloads: `express` (web server), `mysql2` (database driver),
   and `express-session` (login sessions).

### Step C — Run the server

Still inside the `backend` folder, run:
```
npm start
```

You should see:
```
✅ Connected to MySQL database: coffee_shop_db
☕ Coffee Shop Ordering System running at http://localhost:3000
```

### Step D — Open the app

Open your browser and go to:
```
http://localhost:3000
```

You'll land on the login page. Use one of the starter accounts:

| Username | Password    | Role    |
|----------|-------------|---------|
| admin    | password123 | Admin   |
| cashier  | password123 | Cashier |

> ⚠️ These are just demo accounts. For real use, add your own staff logins
> directly in the `users` table via phpMyAdmin (see "Adding staff accounts"
> below), and remove or change the demo accounts.

---

## 4. How the App Works

- **Cashier / Staff** log in and are sent straight to the **New Order**
  (POS) screen. They tap products to add them to the cart, adjust
  quantities, and click **Complete Order** to save it.
- **Admin** logs in and sees the **Dashboard** first, plus extra sidebar
  links: **Manage Products**, **Sales Records**, and can also use
  **New Order** like staff.
- Every completed order is saved to MySQL immediately — in the `orders`
  table (one row per transaction) and `order_items` table (one row per
  product in that order).
- Prices are always read from the database at the moment of checkout, so
  nothing can be tampered with from the browser.

---

## 5. Adding Staff Accounts

There's no "create account" screen (kept simple on purpose). To add a new
staff login:

1. First, generate a password hash. In a terminal, inside the `backend`
   folder, run:
   ```
   node -e "console.log(require('./config/password').hashPassword('your-new-password'))"
   ```
2. Copy the long string it prints out.
3. In phpMyAdmin, open the `users` table and insert a new row:
   - `username`: whatever you want
   - `password`: paste the string from step 2
   - `role`: `admin` or `cashier`

---

## 6. Common Issues

- **"Could not connect to MySQL database"** → Make sure MySQL is running
  in the XAMPP Control Panel, and that you ran the SQL file in phpMyAdmin
  first.
- **Port 3000 already in use** → Close whatever else is using port 3000,
  or change `const PORT = 3000` in `backend/server.js` to another number
  like `3001`.
- **Login fails with correct password** → Make sure you ran the full SQL
  file (it includes the starter accounts with correctly hashed passwords).

---

## 7. Notes on the Code

- Passwords are never stored as plain text. They're hashed using Node's
  built-in `crypto` module (no extra library needed).
- Login sessions are stored in server memory and last 8 hours — enough
  for one shift. Restarting the server logs everyone out (fine for an
  offline, single-machine shop system).
- Deleting a product that's already part of a past order is blocked by
  the database (to protect order history). Use "Mark Unavailable"
  instead — it hides the item from the POS screen without deleting
  historical records.
