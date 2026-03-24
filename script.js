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
    { id: 1, nombre: "Lapachanga", tipo: "Lancha", precio: "MX$10,/9h", capacidad: "12 personas", img: "https://images.unsplash.com/photo-1540946485063-a40da27545f8" },
    { id: 2, nombre: "Gozadera", tipo: "Lancha", precio: "MX$7,500/9h", capacidad: "8 personas", img: "https://images.unsplash.com/photo-1601581875039-e899893d520c" },
    { id: 3, nombre: "Monky", tipo: "Lancha (buceo)", precio: "MX7,000/5h", capacidad: "10 personas", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" }
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
    select.innerHTML = '<option value="">Elige un yate...</option>';
    yates.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.id;
        opt.textContent = `${y.nombre} - ${y.precio}`;
        select.appendChild(opt);
    });

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

// =============================================
// WHATSAPP MENU (agregado al final - sin tocar nada anterior)
// =============================================
function abrirWhatsApp() {
    const phone = "5212295202785"; // ← CAMBIA por tu número real (con 52 al inicio)
    
    const mensaje = `¡Hola! Gracias por visitarnos 👋

Tenemos el siguiente menú de opciones:

1. Renta de yates y Lanchas
2. Venta de yates y Lanchas
3. Venta de Remolques o Mantenimiento
4. Hablar con un Asesor

Responde con el número de la opción que deseas.

Enlaces directos (con Bitly para geolocalización y seguimiento):
1. https://bit.ly/renta-elite
2. https://bit.ly/venta-yates
3. https://bit.ly/remolques-mantenimiento
4. https://bit.ly/asesor-elite`;

    const encoded = encodeURIComponent(mensaje);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
}

// Activar el botón flotante
document.getElementById('whatsapp-btn').addEventListener('click', function(e) {
    e.preventDefault();
    abrirWhatsApp();
});
