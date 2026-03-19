# Sensecure Tender247 BMS Flow Notes

> Observation note prepared from live login on `18-03-2026` plus route/API inspection of `https://sensecure.tender247.com/login`.

## 1. Basic portal summary

- Portal name: `BMS` / Bid Management System
- Login URL: `https://sensecure.tender247.com/login`
- Logged-in user seen after login: `Purnima Nigam`
- Role returned by login API: `Admin`
- Designation returned by login API: `Director`
- Department returned by login API: `Software`

Simple understanding:

- This portal tender discovery + tender tracking + finance request + MIS reporting ka combined system hai.
- Left side menu se user tender list dekh sakta hai, assigned tenders track kar sakta hai, finance request manage kar sakta hai, aur MIS / analytics reports nikal sakta hai.
- Current login ke saath kaafi operational pages khul rahe hain, lekin kuch analytics pages ka minute UI dump directly render capture se poora nahi mila. Unka purpose app routes aur API names se infer kiya gaya hai.

## 2. Login flow

### Login page par kya dikhta hai

- Heading: `Sign in`
- Field 1: `User Id`
- Field 2: `Password`
- Action button: `Sign In`
- Password field ke saath show/hide icon bhi hai
- Footer me Tender247 branding hai

### Login karne ka simple flow

1. `User Id` enter karo
2. `Password` enter karo
3. `Sign In` par click karo
4. Successful login ke baad user `dashboard` par land karta hai

### Login ke baad backend kya deta hai

- User identity
- role / designation / department
- JWT token
- user history id
- company-linked bidder side token (`car_key`)

Yeh clear karta hai ki portal token-based authenticated app hai, aur pages mostly API se data load karte hain.

## 3. Main navigation structure

Left menu me yeh major sections mile:

### Dashboard

- `Sales Dashboard`
- `Finance Dashboard`

### Tender

- `Tender`

### Tender Result

- `Tender Result`

### Analytics

- `Company Profile`
- `Competitors`
- `Tender Results`
- `MIS Reports`
- `Compare Bidders`
- `Missed Opportunity`

### Tender Task

- `My Tender`
- `In-Process Tender`
- `Assigned To Team`
- `Submitted Tender`
- `Dropped Tender`

### Finance Management

- `New Request`
- `Approve Request`
- `Denied Request`
- `Completed Request`

### MIS

- `Finance MIS`
- `Sales MIS`
- `Login MIS`

## 4. Dashboard flow

### Sales Dashboard par kya dikha

Top heading:

- `Sales Dashboard`

Welcome area:

- `Welcome Purnima Nigam!`

Main KPI cards observed:

- `Fresh Tender`: `0`
- `Live Tender`: `231`
- `New Submitted Tender`: `0`
- `Awarded Tender`: `0`
- `Lost Tender`: `0`
- `My Tender`: `0`
- `New In Process Tender`: `0`
- `Assigned To Team`: `0`

Other widgets:

- calendar widget
- `Today's Activity` panel

### Dashboard ka practical use

- User ko ek glance me tender volume dikhta hai
- Kaunse tenders live hain aur kaunse buckets empty hain woh turant samajh aata hai
- Calendar + activity panel reminder / tracking nature ka lagta hai

## 5. Tender page

### Page purpose

- Fresh aur live tender discovery
- Relevant tenders shortlist / review karna
- Tender detail page open karna

### Visible controls

- `Tender Filter`
- `Export To Excel`
- status toggle buttons:
  - `Fresh`
  - `Live(231)`
  - `Archive`
  - `Interested`

### Tender row me kya-kya dikhta hai

Observed row structure se yeh fields milte hain:

- serial number
- tender value
- closing date / days left
- EMD amount
- source / platform tag like `GEM`, `IREPS`, `N/A`
- tender title
- authority / organization name
- city / state / country
- `Tender Id`
- clickable detail link like `/tenderdetail/86597`

### Sample records ka nature

Current list me surveillance, CCTV, access control, RTU, SCADA, maintenance, video wall, railway signalling type tenders dikh rahe the. Isse clear hai ki portal company-specific market-relevant tenders track kar raha hai.

### User flow

1. Tender page kholo
2. `Tender Filter` use karke shortlist karo
3. `Fresh` ya `Live` bucket choose karo
4. Kisi tender title par click karke detail page kholo
5. Aage interest / assignment / task flow me le jaaya ja sakta hai

## 6. Tender Result page

### Page purpose

- Closed / result-side tenders dekhna
- Result stage aur bidder outcome tracking

### Visible controls

- `Export To Excel`
- `Fresh Result`
- `Tender Result(52815)`

### Row-level visible information

- serial number
- tender/result value
- date or `Refer Document`
- stage like `AOC`, `Financial`
- result title
- detail link like `/tenderresultdetail/15310628`

### Simple understanding

- Yeh page tender discovery ke baad result monitoring ke liye hai
- Yahan se competitor analysis aur bidder comparison ka input bhi mil sakta hai

## 7. Tender Task section

Yeh section operational work tracking jaisa lagta hai. Isme tender tab se shortlist hone ke baad actual working buckets bante honge.

### My Tender

Visible items:

- `Tender Filter`
- `Export To Excel`
- tabs:
  - `New`
  - `Live(0)`
  - `Archive`

Observed current state:

- `No Record Found.`

Meaning:

- Yeh likely personally owned / directly handled tenders ka bucket hai

### In-Process Tender

Visible items:

- `Tender Filter`
- `Export To Excel`
- tabs:
  - `Live(0)`
  - `Archive`

Observed current state:

- `No Record Found.`

Meaning:

- Yeh actively worked tenders ka stage bucket hai

### Assigned To Team

Visible items:

- `Tender Filter`
- `Export To Excel`
- tabs:
  - `New`
  - `Live(0)`
  - `Archive`

Observed current state:

- `No Record Found.`

Meaning:

- Team allocation ke baad tender yahan aata hoga

### Submitted Tender

Visible items:

- `Tender Filter`
- `Export To Excel`
- tab:
  - `Submitted Tender(0)`

Observed current state:

- `No Record Found.`

Meaning:

- Final submission complete hone ke baad tender yahan dikhega

### Dropped Tender

Visible items:

- `Tender Filter`
- `Export To Excel`
- tabs:
  - `New(0)`
  - `Live(0)`
  - `Archive(1)`

Observed list text:

- `No Record Found.`

Meaning:

- Drop / cancel / revoke type tenders ka bucket

## 8. Finance Management section

Yeh section tender-related financial approvals ke liye bana hua lagta hai.

### Common pages

- `New Request`
- `Approve Request`
- `Denied Request`
- `Completed Request`

### In sab pages me common table columns

- `#`
- `TENDER ID`
- `REQUIREMENT`
- `PAYMENT MODE`
- `AMOUNT`
- `REQUESTER NAME`
- `FINANCE EXECUTIVE`
- `REQUESTED DATE`
- `DEADLINE DATE`
- `VALIDITY`
- `APPROVAL STATUS`
- `ACTION`

### Common controls

- `Export To Excel`
- page size options:
  - `Show 10`
  - `Show 20`
  - `Show 30`
  - `Show 40`
  - `Show 50`
- pagination:
  - `Prev`
  - `Next`

### Current observed state

- All 4 pages par `No data found`

### Simple workflow understanding

1. Tender se related koi financial need raise hoti hai
2. `New Request` me request create / list hoti hai
3. Approval queue `Approve Request` me aati hai
4. Reject hone par `Denied Request`
5. Complete hone par `Completed Request`

## 9. MIS section

## Finance MIS

### Visible filter fields

- `Tender Id`
- `Search Text`
- `Organization Name`
- `Requirement`
- `Request from`
- `Request To`
- `Status`
- `Payment mode`
- `Payment Date From`
- `Payment Date To`
- `Favour Of`
- `Amount`

### Action buttons

- `Search`
- `Clear`

### Simple understanding

- Finance transaction / request search page hai
- Specific tender ya payment trail dhoondhne ke liye useful hai

## Sales MIS

### Visible filters

- `User Name`
- date range field (`Date From -> Date To`)
- page-size selector

### Action buttons

- `Search`
- `Clear`
- `Export To Excel`

### Table columns

- `#`
- `USER NAME`
- `ASSIGNED`
- `IN PROCESS`
- `SUBMITTED`
- `CANCELLED`
- `AWARDED`
- `LOST`
- `REJECTED`
- `DROPPED`
- `REOPENED`
- `TECHNICAL`
- `FINANCIAL`
- `TOTAL TENDER`

### Sample live data observed from API

- `Purnima Nigam`: Assigned `11`, In Process `3`, Total `14`
- `Megha Patra`: Assigned `62`, In Process `2`, Total `65`
- `Ankit Mishra`: Assigned `37`, In Process `2`, Total `40`

### Simple understanding

- Yeh user-wise sales / tender workload tracking page hai
- Team performance ya allocation balance dekhne ke liye useful hai

## Login MIS

### Live API me observed fields

- `user_name`
- `login_date_time`
- `logout_date_time`
- `ip_address`

### Sample observed data

- `Purnima Nigam` login date `18-03-2026`, IP `10.60.137.145`
- `Anju Ahirwar` login date `18-03-2026`, IP `10.60.137.145`

### Simple understanding

- User login audit report
- Attendance-like monitoring nahi, but access log / security audit type use

## 10. Analytics section

Direct full screen dump yahan poora capture nahi ho paya, lekin route names aur live frontend API mappings se section ka purpose kaafi clear hai.

## Company Profile

Frontend code se related data sources:

- dashboard count
- state-wise published tenders
- ownership-wise tendering
- department-wise data
- month-wise tender chart
- stage-wise data

Simple understanding:

- Company ka tender footprint analytics page
- Charts / summaries ke through dikhata hoga ki company kis state, ownership type, department aur month me kis tarah participate kar rahi hai

## Competitors

Code hints se yeh competitor-wise reporting page lagta hai.

Likely focus:

- competitor-wise tender participation
- competitor comparison reports
- export/reporting support

## Analytics Tender Results

- Tender result trends
- Result-side analytics
- Possibly bidder outcome and stage tracking

## MIS Reports

Code me multiple report families mile:

- state-wise
- department-wise
- bidder-wise
- ownership-wise
- month-wise
- category-wise
- value-wise
- competitor-wise
- PDF / sample PDF download support

Simple understanding:

- Yeh high-level report hub hai
- Yahan se different management reports nikle ja sakte hain

## Compare Bidders

Likely purpose:

- same tender me participating bidders compare karna
- result-side bidder positioning dekhna

## Missed Opportunity

Likely purpose:

- woh tenders jo company pursue nahi kar payi
- missed business opportunities track karna

## 11. Overall end-to-end simple business flow

Portal ko simple language me aise samjho:

1. User login karta hai
2. Dashboard par overall status dekhta hai
3. `Tender` page par fresh/live tenders shortlist karta hai
4. Relevant tender ko interest / assignment flow me bheja jata hai
5. Tender `My Tender`, `Assigned To Team`, `In-Process Tender` buckets me move karta hai
6. Finance need ho to `Finance Management` me request uthti hai
7. Submission hone par tender `Submitted Tender` me jata hai
8. Result aane par `Tender Result` aur analytics pages me outcome track hota hai
9. Team performance aur audit `Sales MIS`, `Finance MIS`, `Login MIS` me dekhe jaate hain

## 12. Important notes / gaps

- Login, dashboard, tender, tender result, tender task, finance request, finance MIS, sales MIS aur login MIS ka structure achchhe se confirm hua.
- Analytics ke menu items confirm hue, aur unka backend / frontend purpose bhi code se clear hua.
- Lekin `Company Profile`, `Competitors`, `MIS Reports`, `Compare Bidders`, `Missed Opportunity` ke exact on-screen chart labels / field labels ko fully visual dump karne ke liye ek dedicated browser-interaction pass aur chahiye.
- Is document ko first strong operational map samjho, not yet final pixel-perfect field inventory for every analytics screen.
