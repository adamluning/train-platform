console.log("APP LOADED")

let AUTH_TOKEN = localStorage.getItem("auth_token") || null

let currentYear = new Date().getFullYear()
let currentMonth = new Date().getMonth() + 1

let calendarData = {}
let selectedDate = null

const MONTH_NAMES = [
  "January","February","Mars","April","May","June",
  "July","August","September","October","November","December"
]

let selectedYears = [
    new Date().getFullYear(),
    new Date().getFullYear() - 1
]

function prevMonth() {
    currentMonth--
    if (currentMonth === 0) {
        currentMonth = 12
        currentYear--
    }
    loadCalendar()
}

function nextMonth() {
    currentMonth++
    if (currentMonth === 13) {
        currentMonth = 1
        currentYear++
    }
    loadCalendar()
}

function bootApp(){
    document.getElementById("auth-panel").style.display = "none"
    document.getElementById("register-panel").style.display = "none"
    document.getElementById("app-root").style.display = "block"

    loadCalendar()
    loadGoals()
    loadStats()
    loadPBs()
}

async function authFetch(url, options = {}) {
    if(!AUTH_TOKEN){
        throw new Error("Not authenticated")
    }

    options.headers = options.headers || {}
    options.headers["Authorization"] = `Bearer ${AUTH_TOKEN}`

    return fetch(url, options)
}

window.onload = () => {
    if(AUTH_TOKEN){
        bootApp()
    } else {
        document.getElementById("auth-panel").style.display = "block"
    }
}

window.addEventListener("resize", () => {
    loadStats()
})

async function login() {
    const email = document.getElementById("auth-email").value
    const password = document.getElementById("auth-password").value

    const res = await fetch("http://api/auth/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if(data.token){
        AUTH_TOKEN = data.token
        localStorage.setItem("auth_token", AUTH_TOKEN)
        bootApp()
    } else {
        alert("Login failed")
    }
}

function logout(){
    AUTH_TOKEN = null
    localStorage.removeItem("auth_token")
    location.reload()
}

async function register() {
    const email = document.getElementById("reg-email").value
    const password = document.getElementById("reg-password").value

    if(!email.includes("@")){
        alert("Enter a valid email")
        return
    }

    const res = await fetch("http://api/auth/register", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if(data.token){
        AUTH_TOKEN = data.token
        localStorage.setItem("auth_token", AUTH_TOKEN)
        bootApp()
    } else {
        alert("Registration failed")
    }
}

function showRegister(){
    document.getElementById("auth-panel").style.display = "none"
    document.getElementById("register-panel").style.display = "block"
}

function showLogin(){
    document.getElementById("register-panel").style.display = "none"
    document.getElementById("auth-panel").style.display = "block"
}

async function loadCalendar() {
    console.log("loadCalendar() called")

    const res = await authFetch(`http://api/calendar?year=${currentYear}&month=${currentMonth}`)
    calendarData = await res.json()

    document.getElementById("month-label").innerText =
        `${MONTH_NAMES[currentMonth-1]} ${currentYear}`

    renderCalendar(currentYear, currentMonth)
    loadStats()

    if (selectedDate && calendarData[selectedDate]) {
        selectDay(selectedDate)
    }
}

async function renderCalendar(year, month) {
    const grid = document.getElementById("calendar-grid")
    grid.innerHTML = ""

    const firstDay = new Date(year, month-1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()

    for(let i=1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        const cell = document.createElement("div")
        cell.className = "day"
        cell.onclick = () => selectDay(dateStr)

        cell.innerHTML = `<div class="day-number">${i}</div>`

        if(calendarData[dateStr]) {
            calendarData[dateStr].forEach(_=>{
                const dot = document.createElement("div")
                dot.className = "session-dot"
                cell.appendChild(dot)
            })
        }

        grid.appendChild(cell)
    }
}

async function selectDay(dateStr) {
    selectedDate = dateStr

    document.getElementById("selected-day").innerText = dateStr
    const container = document.getElementById("day-sessions")
    container.innerHTML = ""

    const sessions = calendarData[dateStr] || []

    sessions.forEach(s => {
        const card = document.createElement("div")
        card.className = "session-card"
        card.id = `session-${s.id}`

        card.innerHTML = renderSessionCard(s)

        container.appendChild(card)
    });
}

function renderSessionCard(s){
    return `
    <div class="session-card">
        <div class="session-header">
        <div class="session-title">${s.title}</div>
            <div>
                ${s.completed 
                ? `✅ <span class="session-volume">🏃 ${s.distance_km.toFixed(1)} km · ⏱ ${s.duration_min} min</span>`
                : `⏳`
                }
            </div>
        </div>

        <div class="session-desc">${s.description}</div>

        ${s.notes ? `<div class="session-notes">📝 ${s.notes}</div>` : ""}

        <div class="session-actions">
            ${!s.completed ? `<button onclick="complete_s(${s.id})">Complete</button>` : ""}
            <input id="note-${s.id}" placeholder="Add note">
            <button onclick="addNote(${s.id})">Save note</button>
            <button onclick="delete_s(${s.id})">Delete</button>
        </div>
    </div>
    `
}

async function addSession() {
    const title = document.getElementById("session-title").value
    const desc = document.getElementById("session-desc").value
    let date = document.getElementById("session-date").value

    if (!date) {
        const now = new Date()
        date = now.toISOString().split("T")[0]
    }

    await authFetch("http://api/sessions", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            title: title,
            description: desc,
            date: date,
            completed: false,
            notes: ""
        })
    })

    document.getElementById("session-title").value = ""
    document.getElementById("session-desc").value = ""
    document.getElementById("session-date").value = new Date().getDate()    

    loadCalendar()
}

async function complete_s(id) {
    const card = document.getElementById(`session-${id}`)
    if(!card) return
    if(card.querySelector(".volume-box")) return

    const vol = document.createElement("div")
    vol.className = "volume-box"

    vol.innerHTML = `
        <input id="dist-${id}" placeholder="km" type="number" step="0.1">
        <input id="dur-${id}" placeholder="min" type="number">
        <button onclick="submitVolume(${id})">Save</button>
    `

    card.appendChild(vol)
}

async function submitVolume(id) {
    const distance = parseFloat(document.getElementById(`dist-${id}`).value || 0)
    const duration = parseInt(document.getElementById(`dur-${id}`).value || 0)


    await authFetch(`http://api/sessions/${id}/complete`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            distance_km: distance,
            duration_min: duration
        })
    })

    await loadCalendar()
    if (selectedDate) selectDay(selectedDate)
}

async function addNote(id) {
    const note = document.getElementById(`note-${id}`).value

    await authFetch(`http://api/sessions/${id}/note`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            note: note
        })
    })

    document.getElementById(`note-${id}`).value = ""

    await loadCalendar()
    if (selectedDate) selectDay(selectedDate)
}

async function delete_s(id) {
    await authFetch(`http://api/sessions/${id}/delete`, {
        method: "DELETE"
    })

    await loadCalendar()
    if (selectedDate) selectDay(selectedDate)
}

async function loadGoals() {
    console.log("loadGoals() called")
    const now = new Date()
    const year = now.getFullYear()

    const res = await authFetch(`http://api/goals?year=${year}`)
    const goals = await res.json()

    const container = document.getElementById("goals-list")
    container.innerHTML = ""
    if (goals) {
        goals.forEach(g => {
            const div = document.createElement("div")
            div.innerHTML = `
                <b>${g.title} </b> — ${g.target} — ${g.end_date}
                <button onclick="delete_g(${g.id})">Delete</button>
            `
            container.appendChild(div)
        });
    }
}

async function addGoal() {
    const title = document.getElementById("goal-title").value
    const target = document.getElementById("goal-target").value
    let date = document.getElementById("goal-date").value

    if (!date) {
        const year = new Date().getFullYear()
        date = `${year}-12-31`
    }

    await authFetch("http://api/goals", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            title: title,
            target: target,
            end_date: date
        })
    })

    document.getElementById("goal-title").value = ""
    document.getElementById("goal-target").value = ""
    document.getElementById("goal-date").value = new Date().getDate()

    loadGoals()
}

async function delete_g(id) {
    await authFetch(`http://api/goals/${id}/delete`, {
        method: "DELETE"
    })
    loadGoals()
}

async function loadStats(){
    statsMonth()
    statsYear()
}

async function statsMonth() {
    const res = await authFetch(`http://api/stats/month?year=${currentYear}&month=${currentMonth}`)
    const data = await res.json()
    console.log("stats data:", data)

    const canvas = document.getElementById("statsChart")
    const ctx = canvas.getContext("2d")
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.font = "14px Inter"

    const dist = data.monthly_distance_km || 0
    const dur = data.monthly_duration_min || 0

    const baseX = 160
    const barY1 = 20
    const barY2 = 70
    const maxWidth = canvas.width - baseX - 40

    const MAX_DISTANCE = 150
    const MAX_DURATION = 1500

    const distScale = maxWidth / MAX_DISTANCE
    const durScale  = maxWidth / MAX_DURATION

    const distWidth = Math.min(dist, MAX_DISTANCE) * distScale
    const durWidth = Math.min(dur, MAX_DURATION) * durScale

    // Distance bar
    ctx.fillStyle = "#22c55e"
    ctx.fillRect(baseX, barY1, distWidth, 30)

    // Time bar
    ctx.fillStyle = "#60a5fa"
    ctx.fillRect(baseX, barY2, durWidth, 30)

    // labels
    ctx.fillStyle = "#e5e7eb"
    ctx.fillText("Distance (km)", 20, barY1+20)
    ctx.fillText("Time (min)", 20, barY2+20)

    ctx.fillText(dist.toFixed(1), baseX + distWidth + 8, barY1+20)
    ctx.fillText(dur.toString(), baseX + durWidth+ 8, barY2+20)
}

async function statsYear() {
    const canvas = document.getElementById("yearlyChart")
    const ctx = canvas.getContext("2d")

    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1

    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio

    canvas.style.width = rect.width + "px"
    canvas.style.height = rect.height + "px"

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

    ctx.clearRect(0, 0, rect.width, rect.height)

    const colors = ["#22c55e","#60a5fa","#f59e0b","#ef4444","#a78bfa"]

    let allData = []

    for(let i=0;i<selectedYears.length;i++){
        const year = selectedYears[i]
        const res = await authFetch(`http://api/stats/year?year=${year}`)
        const data = await res.json()
        allData.push({year,data,color:colors[i%colors.length]})
    }

    // chart dimensions
    const width = rect.width
    const height = rect.height

    const padding = 50
    const baseY = height - padding
    const chartHeight = height - padding*2
    const chartWidth = width - padding*2

    // scale
    const maxVal = Math.max(
        ...allData.flatMap(y => y.data.map(m => m.distance_km)),
        1
    )

    const scaleY = chartHeight / maxVal
    const stepX = chartWidth / 11

    // axes
    ctx.strokeStyle="#94a3b8"
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, baseY)
    ctx.lineTo(width-padding, baseY)
    ctx.stroke()

    // y-axis ticks
    ctx.fillStyle = "#e5e7eb"
    ctx.font = "12px Inter"

    const steps = 5
    for(let i=0;i<=steps;i++){
        const val = (maxVal/steps)*i
        const y = baseY - val*scaleY

        ctx.fillText(val.toFixed(0), 30, y+4)

        ctx.strokeStyle = "#334155"
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(width-padding, y)
        ctx.stroke()
    }

    // month labels
    ctx.fillStyle="#e5e7eb"
    for(let m=0;m<12;m++){
        const x = padding + m*stepX
        ctx.fillText(MONTH_NAMES[m].substring(0,3), x-8, baseY + 20)
    }

    // draw lines
    allData.forEach(y=>{
        ctx.strokeStyle = y.color
        ctx.fillStyle = y.color
        ctx.lineWidth = 2
        ctx.beginPath()

        y.data.forEach((m,i)=>{
            const x = padding + i*stepX
            const yPos = baseY - m.distance_km*scaleY

            if(i===0) ctx.moveTo(x,yPos)
            else ctx.lineTo(x,yPos)
        })

        ctx.stroke()

        // markers
        y.data.forEach((m,i)=>{
            const x = padding + i*stepX
            const yPos = baseY - m.distance_km*scaleY

            ctx.beginPath()
            ctx.arc(x,yPos,4,0,Math.PI*2)
            ctx.fill()
        })

        // legend
        ctx.fillText(
            y.year,
            width - 120,
            20 + selectedYears.indexOf(y.year)*18
        )
    })

    // axis labels
    ctx.fillStyle="#e5e7eb"
    ctx.font="14px Inter"
    ctx.fillText("Month", width/2 - 30, height - 10)

    ctx.save()
    ctx.translate(15, height/2)
    ctx.rotate(-Math.PI/2)
    ctx.textAlign = "center"
    ctx.fillText("Distance (km)", 0, 0)
    ctx.restore()

    ctx.textAlign = "left"
}

async function addMonthlyVolume() {
    const year = parseInt(document.getElementById("mv-year").value)
    const month = parseInt(document.getElementById("mv-month").value)
    const distance = parseFloat(document.getElementById("mv-distance").value)
    const duration = parseInt(document.getElementById("mv-duration").value)

    if(!year || !month || !distance || !duration){
        alert("Fill all fields")
        document.getElementById("mv-year").value = ""
        document.getElementById("mv-month").value = ""
        document.getElementById("mv-distance").value = ""
        document.getElementById("mv-duration").value = ""
        return
    }

    await authFetch("http://api/stats/manual", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            year,
            month,
            distance_km:distance,
            duration_min:duration
        })
    })

    document.getElementById("mv-year").value = ""
    document.getElementById("mv-month").value = ""
    document.getElementById("mv-distance").value = ""
    document.getElementById("mv-duration").value = ""

    loadStats()
}

async function loadPBs() {
    console.log("loadPBs() called")

    const res = await authFetch(`http://api/pbs`)
    const pbs = await res.json()

    const container = document.getElementById("pb-list")
    container.innerHTML = ""
    if (pbs) {
        pbs.forEach(pb => {
            const div = document.createElement("div")
            div.className = "pb-card"
            div.innerHTML = `
                <b>${pb.distance} km </b> ${pb.time}</b>
                <button onclick="delete_pb(${pb.id})">Delete</button>
            `
            container.appendChild(div)
        });
    }
}

async function addPB() {
    const distance = parseFloat(document.getElementById("pb-distance").value)
    let time = document.getElementById("pb-time").value

    if(!distance || !time){
        alert("Fill distance and time")
        return
    }

    // Force HH:MM:SS
    if(time.length === 5){
        time = time + ":00"
    }

    await authFetch("http://api/pbs", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            distance: distance,
            time: time,
        })
    })

    document.getElementById("pb-distance").value = ""
    document.getElementById("pb-time").value = ""

    loadPBs()
}

async function delete_pb(id) {
    await authFetch(`http://api/pbs/${id}/delete`, {
        method: "DELETE"
    })
    loadPBs()
}