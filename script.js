// ==================== FIREBASE CONFIG ====================
// PASO 3: PEGA AQUÍ TUS DATOS REALES del Firebase Console
// (Ve a tu proyecto → Configuración del proyecto → SDK de Firebase → Copia el objeto completo)
const firebaseConfig = {
    apiKey: "AIzaSyCDtCAOAalVb0ReJjSaIzjEQimoQ-9_4e0",
    authDomain: "elite-yacht-rentals.firebaseapp.com",
    projectId: "elite-yacht-rentals",
    storageBucket: "elite-yacht-rentals.firebasestorage.app",
    messagingSenderId: "601846230412",
    appId: "1:601846230412:web:e9b96b3aedfa013617faa9"
  };

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Datos de yates
const yates = [
    { id: 1, nombre: "La Gozadera", tipo: "Lancha", precio: "MX$9,000/8h", capacidad: "Hasta 7 personas", Incluye: "Capitan,Gasolina e insumos", img: "https://images.unsplash.com/photo-1776209301902-7da8b91f85d9?q=80&w=586&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 2, nombre: "La Pachanga 45", tipo: "Lancha", precio: "MX$12,900/h", capacidad: "8 personas", img: "https://images.unsplash.com/photo-1601581875039-e899893d520c" },
    { id: 3, nombre: "Monky", tipo: "Yate", precio: "MX$45,000/h", capacidad: "20 personas", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" },
    { id: 4, nombre: "Percales", tipo: "Lancha", precio: "MX$12,900/h", capacidad: "8 personas", img: "https://images.unsplash.com/photo-1776208903634-4aab68769156?q=80&w=1022&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" } 
];

// Renderizar flota
function renderFlota() {
    const grid = document.getElementById('flota-grid');
    grid.innerHTML = '';
    yates.forEach(y => {
        const card = document.createElement('div');
        card.className = 'card-yate bg-slate-900 rounded-3xl overflow-hidden';
        card.innerHTML = `
            <img src="${y.img}" class="w-full h-64 object-cover">
            <div class="p-6">
                <h3 class="text-2xl font-bold">${y.nombre}</h3>
                <p class="text-amber-400">${y.tipo} • ${y.capacidad}</p>
                <p class="text-3xl font-bold text-amber-400 mt-2">${y.precio}</p>
                <button onclick="seleccionarYate(${y.id}); abrirModal()" class="mt-6 w-full bg-amber-500 text-black py-4 rounded-2xl font-semibold hover:bg-amber-600">Reservar este yate</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ==================== RESERVAS CON FIRESTORE (EN TIEMPO REAL) ====================
let reservas = [];

// Cargar reservas en tiempo real
function cargarReservas() {
    const lista = document.getElementById('lista-reservas');
    lista.innerHTML = '<p class="text-amber-400">Cargando reservas en tiempo real...</p>';

    db.collection("reservas").onSnapshot((snapshot) => {
        reservas = [];
        snapshot.forEach(doc => {
            reservas.push({ id: doc.id, ...doc.data() });
        });
        mostrarReservasEnLista();
    });
}

function mostrarReservasEnLista() {
    const lista = document.getElementById('lista-reservas');
    lista.innerHTML = '';
    if (reservas.length === 0) {
        lista.innerHTML = '<p class="text-slate-500">Aún no hay reservas</p>';
        return;
    }
    reservas.forEach(r => {
        const div = document.createElement('div');
        div.className = 'bg-slate-800/70 p-4 rounded-2xl flex justify-between items-center';
        div.innerHTML = `
            <div>
                <p class="font-semibold">${r.yate}</p>
                <p class="text-sm text-amber-300">${r.fecha} • ${r.hora}</p>
            </div>
            <button onclick="cancelarReserva('${r.id}')" class="text-red-400 text-xs">Cancelar</button>
        `;
        lista.appendChild(div);
    });
}

// Realizar reserva (guardada en Firebase)
async function realizarReserva() {
    const yateId = parseInt(document.getElementById('select-yate').value);
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    if (!yateId || !fecha || !hora) {
        alert("❌ Completa todos los campos");
        return;
    }

    const yate = yates.find(y => y.id === yateId);

    const snapshot = await db.collection("reservas")
        .where("yateId", "==", yateId)
        .where("fecha", "==", fecha)
        .where("hora", "==", hora)
        .get();

    if (!snapshot.empty) {
        alert("⛔ Esta fecha y hora ya está reservada");
        return;
    }

    await db.collection("reservas").add({
        yate: yate.nombre,
        yateId: yateId,
        fecha: fecha,
        hora: hora,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert(`✅ Reserva confirmada en la nube!\n${yate.nombre}\n${fecha} a las ${hora}`);
    cerrarModal();
}

// Cancelar reserva
async function cancelarReserva(docId) {
    if (confirm("¿Cancelar esta reserva?")) {
        await db.collection("reservas").doc(docId).delete();
    }
}

// Funciones del modal
function seleccionarYate(id) {
}

function abrirModal() {
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').classList.add('flex');
    
    const select = document.getElementById('select-yate');
    
    // Limpiar y llenar el selector correctamente
    select.innerHTML = '<option value="">Elige un yate o lancha...</option>';
    
    yates.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.id;
        opt.textContent = `${y.nombre} - ${y.tipo} - ${y.precio}`;
        select.appendChild(opt);
    });

    // Inicialización de Flatpickr cada vez que se abre el modal
    flatpickr("#fecha", {
        locale: "es",
        minDate: "today",
        dateFormat: "d F Y",
        disableMobile: "true"
    });
}

function cerrarModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('flex');
}

// Inicializar todo
document.addEventListener('DOMContentLoaded', () => {
    renderFlota();
    
    flatpickr("#fecha", {
        locale: "es",
        minDate: "today",
        dateFormat: "d F Y"
    });
    
    cargarReservas();
});
