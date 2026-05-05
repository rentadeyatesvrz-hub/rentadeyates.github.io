// ==================== CONFIG MARKETING / CRM ====================
const SITE_CONFIG = window.SITE_CONFIG || {};
const isRealValue = (value, placeholder) => {
    if (!value || typeof value !== 'string') return false;
    if (placeholder && value === placeholder) return false;
    if (value.includes('XXXXXXXX') || value.includes('YOUR_') || value.includes('tu_') || value.includes('tudominio.com')) return false;
    return true;
};

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            resolve(existing);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve(script);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initGoogleTag() {
    const googleTagId = SITE_CONFIG.googleTagId;
    const googleAdsId = SITE_CONFIG.googleAdsId;
    const realGoogleTag = isRealValue(googleTagId, 'GT-XXXXXXXXXX');
    const realGoogleAds = isRealValue(googleAdsId, 'AW-XXXXXXXXXX');

    if (!realGoogleTag && !realGoogleAds) return;

    const idToLoad = realGoogleTag ? googleTagId : googleAdsId;
    try {
        await loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(idToLoad)}`);
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        if (realGoogleTag) window.gtag('config', googleTagId);
        if (realGoogleAds) window.gtag('config', googleAdsId);
    } catch (error) {
        console.error('No se pudo cargar Google tag:', error);
    }
}

async function initMetaPixel() {
    const metaPixelId = SITE_CONFIG.metaPixelId;
    if (!isRealValue(metaPixelId, '123456789012345')) return;

    try {
        await loadScript('https://connect.facebook.net/en_US/fbevents.js');
        if (!window.fbq) {
            const fbq = function() {
                fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
            };
            fbq.queue = [];
            fbq.loaded = true;
            fbq.version = '2.0';
            window.fbq = fbq;
            window._fbq = fbq;
        }
        window.fbq('init', metaPixelId);
        window.fbq('track', 'PageView');
    } catch (error) {
        console.error('No se pudo cargar Meta Pixel:', error);
    }
}

function trackLeadEvent(payload = {}) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', payload);
    }

    if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', payload);
    }

    const sendTo = SITE_CONFIG.googleAdsSendTo;
    if (typeof window.gtag === 'function' && isRealValue(sendTo, 'AW-XXXXXXXXXX/XXXXXXXXXXXX')) {
        window.gtag('event', 'conversion', {
            send_to: sendTo,
            value: 1.0,
            currency: 'MXN'
        });
    }
}

function trackReserveIntent() {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'begin_checkout', {
            event_category: 'reservas',
            event_label: 'abrir_modal_reserva'
        });
    }

    if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'OpenReservationModal');
    }
}

function normalizePhoneForWhatsApp(value) {
    return String(value || '').replace(/\D+/g, '');
}

function buildWhatsAppMessage(extra = {}) {
    const baseMessage = SITE_CONFIG.whatsappWelcomeMessage || 'Hola, gracias por contactar a Elite Yacht Rentals.';
    const lines = [baseMessage];

    if (extra.nombreCliente) lines.push(`Nombre: ${extra.nombreCliente}`);
    if (extra.telefono) lines.push(`Teléfono: ${extra.telefono}`);
    if (extra.yate) lines.push(`Embarcación: ${extra.yate}`);
    if (extra.fecha) lines.push(`Fecha: ${extra.fecha}`);
    if (extra.hora) lines.push(`Hora: ${formatHourLabel(extra.hora)}`);

    return lines.join('\n');
}

function getWhatsAppLink(extra = {}) {
    const phone = normalizePhoneForWhatsApp(SITE_CONFIG.businessPhone || '522299999999');
    const message = encodeURIComponent(buildWhatsAppMessage(extra));
    return `https://wa.me/${phone}?text=${message}`;
}

function hydrateWhatsAppLinks() {
    const preview = document.getElementById('whatsapp-welcome-preview');
    if (preview) preview.textContent = buildWhatsAppMessage();

    ['whatsapp-float-link', 'whatsapp-contact-link', 'modal-whatsapp-link', 'mobile-whatsapp-link'].forEach((id) => {
        const link = document.getElementById(id);
        if (link) link.href = getWhatsAppLink();
    });
}

function captureTrackingParams() {
    const params = new URLSearchParams(window.location.search);
    const fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    const data = {};

    fields.forEach((field) => {
        const value = params.get(field);
        if (value) {
            data[field] = value;
            localStorage.setItem(`tracking_${field}`, value);
        } else {
            const stored = localStorage.getItem(`tracking_${field}`);
            if (stored) data[field] = stored;
        }
    });

    data.landing_page = window.location.href;
    data.referrer = document.referrer || 'direct';
    data.user_agent = navigator.userAgent;
    return data;
}

function getCRMDeviceType() {
    if (window.matchMedia('(max-width: 640px)').matches) return 'mobile';
    if (window.matchMedia('(max-width: 1024px)').matches) return 'tablet';
    return 'desktop';
}

function validateBirthday(value) {
    if (!value) return 'La fecha de cumpleaños es obligatoria.';

    const selected = new Date(`${value}T00:00:00`);
    const today = new Date();
    const min = new Date('1900-01-01T00:00:00');

    if (Number.isNaN(selected.getTime())) return 'La fecha de cumpleaños no es válida.';
    if (selected > today) return 'La fecha de cumpleaños no puede estar en el futuro.';
    if (selected < min) return 'La fecha de cumpleaños no parece válida.';

    let age = today.getFullYear() - selected.getFullYear();
    const monthDiff = today.getMonth() - selected.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selected.getDate())) {
        age -= 1;
    }

    if (age < 18) return 'El cliente debe ser mayor de edad.';
    return '';
}

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyCDtCAOAalVb0ReJjSaIzjEQimoQ-9_4e0",
    authDomain: "elite-yacht-rentals.firebaseapp.com",
    projectId: "elite-yacht-rentals",
    storageBucket: "elite-yacht-rentals.firebasestorage.app",
    messagingSenderId: "601846230412",
    appId: "1:601846230412:web:e9b96b3aedfa013617faa9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const yates = [
    { id: 1, nombre: "La Gozadera", tipo: "Lancha", precio: "MX$9,000/8h", capacidad: "Hasta 7 personas", incluye: "Capitán,Dos Bolsas de Hielo, Coca-Cola 2L, Combustible, 12 Cerveza, Agua Mineral 2L", img: "https://images.unsplash.com/photo-1776209301902-7da8b91f85d9?q=80&w=586&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 2, nombre: "La Pachanga", tipo: "Lancha", precio: "MX$10,500/8h", capacidad: "Hasta 7 personas", incluye: "Capitán,Dos Bolsas de Hielo, Coca-Cola 2L, Combustible, 12 Cerveza, Agua Mineral 2L", img: "https://images.unsplash.com/photo-1776215340109-2a5f8e02e9ee?q=80&w=324&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 3, nombre: "Monky", tipo: "Lancha", precio: "MX$8,000/8h", capacidad: "10 personas", img: "https://images.unsplash.com/photo-1777789777463-01635c7ed8aa?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 4, nombre: "Percales", tipo: "Lancha", precio: "MX$3,500xh ò MX$16,000/6h", capacidad: "12 personas", incluye: "Capitán,Dos Bolsas de Hielo, Coca-Cola 2L, Combustible, 12 Cerveza, Agua Mineral 2L", img: "https://images.unsplash.com/photo-1776208903634-4aab68769156?q=80&w=1022&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }
];

const HORARIOS_BASE = ['10:00', '11:00', '12:00', '13:00'];

let reservas = [];
let fechaPicker = null;
let cumpleanosPicker = null;
let yateSeleccionado = null;
let toastTimeout = null;
let syncMode = 'Live';
let reservasSincronizadas = false;
let disponiblesActivos = [];
let disponiblesCarouselIndex = 0;
let disponiblesCarouselTimer = null;
let trackingSnapshot = {};

function getReservationContainers() {
    return [
        document.getElementById('lista-reservas-modal'),
        document.getElementById('lista-reservas-section')
    ].filter(Boolean);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function todayText() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mes = meses[ahora.getMonth()];
    const anio = ahora.getFullYear();
    return `${dia} ${mes} ${anio}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeText(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function formatHourLabel(value) {
    const labels = {
        '10:00': '10:00 am',
        '11:00': '11:00 am',
        '12:00': '12:00 pm',
        '13:00': '13:00 pm'
    };
    return labels[String(value ?? '').trim()] || String(value ?? '');
}

function getYatesDisponiblesHoy() {
    const hoy = normalizeText(todayText());
    const reservadosHoyIds = new Set();
    const reservadosHoyNombres = new Set();

    reservas.forEach(reserva => {
        if (normalizeText(reserva.fecha) !== hoy) return;

        if (reserva.yateId !== undefined && reserva.yateId !== null && reserva.yateId !== '') {
            reservadosHoyIds.add(Number(reserva.yateId));
        }

        if (reserva.yate) {
            reservadosHoyNombres.add(normalizeText(reserva.yate));
        }
    });

    return yates.filter(yate => {
        const reservadoPorId = reservadosHoyIds.has(Number(yate.id));
        const reservadoPorNombre = reservadosHoyNombres.has(normalizeText(yate.nombre));
        return !reservadoPorId && !reservadoPorNombre;
    });
}

function clearDisponiblesCarouselTimer() {
    if (disponiblesCarouselTimer) {
        clearInterval(disponiblesCarouselTimer);
        disponiblesCarouselTimer = null;
    }
}

function renderDisponiblesVisualState(state, options = {}) {
    const visual = document.getElementById('hero-disponibles-visual');
    if (!visual) return;

    if (state === 'loading') {
        visual.innerHTML = `
            <div class="today-available-stage today-available-stage--loading">
                <div class="today-available-stage-media shimmer"></div>
                <div class="today-available-stage-body">
                    <div class="skeleton-line w-24"></div>
                    <div class="skeleton-line w-40 mt-3"></div>
                </div>
            </div>
        `;
        return;
    }

    if (state === 'error') {
        visual.innerHTML = `
            <div class="today-available-stage today-available-stage--empty">
                <div class="today-available-stage-copy-only">
                    <p class="today-available-stage-type">Disponibles hoy</p>
                    <h4 class="today-available-stage-name">No se pudo consultar la disponibilidad.</h4>
                    <p class="today-available-stage-meta">Revisa la conexión con Firestore para volver a cargar los yates y lanchas libres.</p>
                </div>
            </div>
        `;
        return;
    }

    if (state === 'empty') {
        visual.innerHTML = `
            <div class="today-available-stage today-available-stage--empty">
                <div class="today-available-stage-copy-only">
                    <p class="today-available-stage-type">Disponibles hoy</p>
                    <h4 class="today-available-stage-name">Todo reservado por hoy</h4>
                    <p class="today-available-stage-meta">Todas las embarcaciones ya tienen al menos una reserva en el día en curso.</p>
                </div>
            </div>
        `;
        return;
    }

    const yate = options.yate;
    const total = options.total || 0;
    const current = options.current || 0;
    if (!yate) return;

    visual.innerHTML = `
        <div class="today-available-stage">
            <div class="today-available-stage-media-wrap">
                <img src="${escapeHtml(yate.img)}" alt="${escapeHtml(`${yate.nombre} disponible hoy`)}" class="today-available-stage-media" loading="eager">
                <div class="today-available-stage-overlay"></div>
                <span class="today-available-stage-index">${current + 1}/${total}</span>
                <div class="today-available-stage-copy">
                    <p class="today-available-stage-type">${escapeHtml(yate.tipo)} disponible</p>
                    <h4 class="today-available-stage-name">${escapeHtml(yate.nombre)}</h4>
                    <p class="today-available-stage-meta">${escapeHtml(yate.capacidad || 'Experiencia privada disponible')}</p>
                    <p class="today-available-stage-price">${escapeHtml(yate.precio || '')}</p>
                </div>
            </div>
        </div>
    `;
}

function updateDisponiblesActiveState() {
    const pills = document.querySelectorAll('.today-available-pill[data-yate-id]');
    pills.forEach((pill, index) => {
        if (index === disponiblesCarouselIndex) {
            pill.classList.add('is-active');
        } else {
            pill.classList.remove('is-active');
        }
    });
}

function renderDisponiblesVisual() {
    if (!disponiblesActivos.length) {
        clearDisponiblesCarouselTimer();
        return;
    }

    if (disponiblesCarouselIndex >= disponiblesActivos.length) {
        disponiblesCarouselIndex = 0;
    }

    const yate = disponiblesActivos[disponiblesCarouselIndex];
    renderDisponiblesVisualState('ready', {
        yate,
        total: disponiblesActivos.length,
        current: disponiblesCarouselIndex
    });
    updateDisponiblesActiveState();
}

function startDisponiblesCarousel() {
    clearDisponiblesCarouselTimer();

    if (disponiblesActivos.length <= 1) {
        return;
    }

    disponiblesCarouselTimer = setInterval(() => {
        if (!disponiblesActivos.length) return;
        disponiblesCarouselIndex = (disponiblesCarouselIndex + 1) % disponiblesActivos.length;
        renderDisponiblesVisual();
    }, 3600);
}

function syncDisponiblesVisual(disponiblesHoy) {
    const previousActiveId = disponiblesActivos[disponiblesCarouselIndex]?.id ?? null;
    disponiblesActivos = disponiblesHoy.slice();

    if (!disponiblesActivos.length) {
        disponiblesCarouselIndex = 0;
        clearDisponiblesCarouselTimer();
        renderDisponiblesVisualState('empty');
        updateDisponiblesActiveState();
        return;
    }

    const preservedIndex = previousActiveId !== null
        ? disponiblesActivos.findIndex(yate => Number(yate.id) === Number(previousActiveId))
        : -1;

    disponiblesCarouselIndex = preservedIndex >= 0
        ? preservedIndex
        : Math.min(disponiblesCarouselIndex, disponiblesActivos.length - 1);

    renderDisponiblesVisual();
    startDisponiblesCarousel();
}

function setDisponibleDestacado(yateId) {
    const foundIndex = disponiblesActivos.findIndex(yate => Number(yate.id) === Number(yateId));
    if (foundIndex === -1) return;
    disponiblesCarouselIndex = foundIndex;
    renderDisponiblesVisual();
    startDisponiblesCarousel();
}

function renderDisponiblesHoy() {
    const availabilityPanel = document.getElementById('hero-live-availability');
    const badge = document.getElementById('hero-panel-badge');
    const count = document.getElementById('hero-disponibles-count');
    const list = document.getElementById('hero-disponibles-hoy');

    if (!list) return;

    availabilityPanel?.classList.remove('is-empty', 'is-loading');

    if (syncMode === 'Error') {
        availabilityPanel?.classList.add('is-empty');
        if (badge) badge.textContent = 'Sync no disponible';
        if (count) count.textContent = '--';
        list.innerHTML = '<div class="today-available-empty">No se pudo consultar la disponibilidad del día.</div>';
        clearDisponiblesCarouselTimer();
        renderDisponiblesVisualState('error');
        return;
    }

    if (!reservasSincronizadas) {
        availabilityPanel?.classList.add('is-loading');
        if (badge) badge.textContent = 'Consultando hoy';
        if (count) count.textContent = '...';
        list.innerHTML = '<div class="today-available-loading">Consultando embarcaciones libres de hoy...</div>';
        clearDisponiblesCarouselTimer();
        renderDisponiblesVisualState('loading');
        return;
    }

    const disponiblesHoy = getYatesDisponiblesHoy();
    const totalEmbarcaciones = yates.length;

    if (badge) {
        badge.textContent = disponiblesHoy.length > 0
            ? `${disponiblesHoy.length} disponible${disponiblesHoy.length === 1 ? '' : 's'} hoy`
            : 'Sin disponibilidad hoy';
    }

    if (count) {
        count.textContent = `${disponiblesHoy.length}/${totalEmbarcaciones}`;
    }

    if (!disponiblesHoy.length) {
        availabilityPanel?.classList.add('is-empty');
        list.innerHTML = '<div class="today-available-empty">Todas las lanchas y yates ya tienen reserva hoy.</div>';
        syncDisponiblesVisual([]);
        return;
    }

    list.innerHTML = disponiblesHoy.map((yate, index) => `
        <button type="button" class="today-available-pill ${index === disponiblesCarouselIndex ? 'is-active' : ''}" onclick="setDisponibleDestacado(${Number(yate.id)})" data-yate-id="${Number(yate.id)}">
            <span class="today-available-pill-thumb">
                <img src="${escapeHtml(yate.img)}" alt="${escapeHtml(yate.nombre)}" class="today-available-pill-image" loading="lazy">
            </span>
            <span class="today-available-pill-copy">
                <span class="today-available-pill-type">${escapeHtml(yate.tipo)}</span>
                <span class="today-available-pill-name">${escapeHtml(yate.nombre)}</span>
            </span>
        </button>
    `).join('');

    syncDisponiblesVisual(disponiblesHoy);
}

function renderHeroPanel() {
    const heroPanel = document.getElementById('hero-feature-panel');
    const heroTitle = document.getElementById('hero-panel-title');
    const heroBadge = document.getElementById('hero-panel-badge');

    if (heroPanel) heroPanel.style.display = '';
    if (heroTitle) heroTitle.textContent = 'Disponibilidad en tiempo real';

    if (heroBadge) {
        if (syncMode === 'Error') {
            heroBadge.textContent = 'Sync no disponible';
        } else if (!reservasSincronizadas) {
            heroBadge.textContent = 'Consultando hoy';
        } else {
            const disponiblesHoy = getYatesDisponiblesHoy().length;
            heroBadge.textContent = disponiblesHoy > 0
                ? `${disponiblesHoy} disponible${disponiblesHoy === 1 ? '' : 's'} hoy`
                : 'Sin disponibilidad hoy';
        }
    }

    renderDisponiblesHoy();
}

function renderFlota() {
    const grid = document.getElementById('flota-grid');
    if (!grid) return;

    grid.innerHTML = '';

    yates.forEach(y => {
        const card = document.createElement('article');
        card.className = 'card-yate premium-surface rounded-[32px] overflow-hidden group relative';

        const incluyeContenido = Array.isArray(y.incluye)
            ? y.incluye.join(', ')
            : (y.incluye || '');

        const incluyeChips = incluyeContenido
            ? incluyeContenido.split(',').map(item => item.trim()).filter(Boolean).slice(0, 6).map(item => `<span class="include-chip">${escapeHtml(item)}</span>`).join('')
            : '';

        const incluyeHTML = incluyeContenido
            ? `
                <div class="mt-4">
                    <p class="text-xs uppercase tracking-[0.2em] text-amber-300/80 mb-3">Incluye</p>
                    <div class="includes-wrap">${incluyeChips}</div>
                </div>
            `
            : '';

        card.innerHTML = `
            <div class="fleet-media h-72">
                <span class="fleet-tag">${escapeHtml(y.tipo)}</span>
                <img src="${y.img}" alt="${escapeHtml(y.nombre)}" class="w-full h-full object-cover">
            </div>
            <div class="p-5 sm:p-6">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="text-2xl font-bold tracking-[-0.03em]">${escapeHtml(y.nombre)}</h3>
                        <p class="text-slate-300 mt-2">${escapeHtml(y.tipo)} • ${escapeHtml(y.capacidad)}</p>
                    </div>
                    <span class="fleet-badge">Elite</span>
                </div>

                <p class="text-3xl font-bold text-amber-300 mt-5">${escapeHtml(y.precio)}</p>

                <div class="fleet-meta">
                    <div class="fleet-meta-item">
                        <span class="fleet-meta-label">Categoría</span>
                        <span class="fleet-meta-value">${escapeHtml(y.tipo)}</span>
                    </div>
                    <div class="fleet-meta-item">
                        <span class="fleet-meta-label">Capacidad</span>
                        <span class="fleet-meta-value">${escapeHtml(y.capacidad)}</span>
                    </div>
                </div>

                ${incluyeHTML}

                <button onclick="seleccionarYate(${y.id}); abrirModal()" class="premium-button mt-6 w-full">Reservar este yate</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderReservasLoading() {
    getReservationContainers().forEach(container => {
        container.innerHTML = `
            <div class="space-y-3">
                <div class="premium-surface p-4 rounded-2xl">
                    <div class="skeleton-line w-2/3"></div>
                    <div class="skeleton-line w-1/2 mt-3"></div>
                </div>
                <div class="premium-surface p-4 rounded-2xl">
                    <div class="skeleton-line w-3/4"></div>
                    <div class="skeleton-line w-2/5 mt-3"></div>
                </div>
            </div>
        `;
    });
}

function reservationItemTemplate(r) {
    return `
        <div class="reservation-item">
            <div class="reservation-item-content">
                <p class="reservation-item-title">${escapeHtml(r.yate)}</p>
                <p class="reservation-item-meta">${escapeHtml(r.fecha)} • ${escapeHtml(formatHourLabel(r.hora))}</p>
            </div>
            <button onclick="cancelarReserva('${r.id}')" class="reservation-cancel">Cancelar</button>
        </div>
    `;
}

function emptyReservationTemplate() {
    return `
        <div class="premium-surface p-5 rounded-3xl text-center border border-dashed border-white/10">
            <p class="text-base font-semibold text-white">Aún no hay reservas</p>
            <p class="text-sm text-slate-400 mt-2">Cuando entren nuevas reservas, aparecerán aquí en tiempo real.</p>
        </div>
    `;
}

function actualizarResumenReservas() {
    setText('reservas-total', String(reservas.length));
    const hoy = todayText();
    const reservasHoy = reservas.filter(r => String(r.fecha || '').toLowerCase() === hoy).length;
    setText('reservas-hoy', String(reservasHoy));
    setText('sync-status', syncMode);
    renderHeroPanel();
}

function cargarReservas() {
    renderReservasLoading();

    db.collection('reservas').onSnapshot((snapshot) => {
        reservas = [];
        snapshot.forEach(doc => {
            reservas.push({ id: doc.id, ...doc.data() });
        });

        reservas.sort((a, b) => {
            const aText = `${a.fecha || ''} ${a.hora || ''}`;
            const bText = `${b.fecha || ''} ${b.hora || ''}`;
            return aText.localeCompare(bText, 'es');
        });

        syncMode = 'Live';
        reservasSincronizadas = true;
        mostrarReservasEnLista();
        actualizarDisponibilidad();
        actualizarResumenReservas();
    }, (error) => {
        console.error('Error al cargar reservas:', error);
        syncMode = 'Error';
        reservasSincronizadas = false;
        setText('sync-status', syncMode);
        renderHeroPanel();
        showToast('No se pudieron sincronizar las reservas en este momento.', 'error');
    });
}

function mostrarReservasEnLista() {
    const containers = getReservationContainers();
    if (!containers.length) return;

    if (reservas.length === 0) {
        containers.forEach(container => {
            container.innerHTML = emptyReservationTemplate();
        });
        return;
    }

    const html = reservas.map(reservationItemTemplate).join('');
    containers.forEach(container => {
        container.innerHTML = html;
    });
}

function obtenerHorasReservadas(yateId, fecha) {
    if (!yateId || !fecha) return [];
    return reservas
        .filter(r => Number(r.yateId) === Number(yateId) && r.fecha === fecha)
        .map(r => r.hora);
}

function actualizarDisponibilidad() {
    const yateId = parseInt(document.getElementById('select-yate')?.value || '', 10);
    const fecha = document.getElementById('fecha')?.value || '';
    const horaSelect = document.getElementById('hora');
    const availability = document.getElementById('availability-status');

    if (!horaSelect || !availability) {
        renderHeroPanel();
        return;
    }

    const horasReservadas = obtenerHorasReservadas(yateId, fecha);
    let horasDisponibles = 0;

    Array.from(horaSelect.options).forEach(option => {
        if (!option.value) return;
        const reservada = horasReservadas.includes(option.value);
        option.disabled = reservada;
        option.textContent = reservada ? `${formatHourLabel(option.value)} • Reservado` : formatHourLabel(option.value);
        if (reservada && horaSelect.value === option.value) {
            horaSelect.value = '';
        }
        if (!reservada) {
            horasDisponibles += 1;
        }
    });

    availability.classList.remove('state-warning', 'state-danger', 'state-success');

    if (!yateId || !fecha) {
        availability.textContent = 'Selecciona una embarcación y una fecha para ver horarios disponibles.';
        renderHeroPanel();
        return;
    }

    if (horasDisponibles === 0) {
        availability.classList.add('state-danger');
        availability.textContent = 'No hay horarios disponibles para esta combinación. Prueba otra fecha u otra embarcación.';
        renderHeroPanel();
        return;
    }

    if (horasReservadas.length > 0) {
        availability.classList.add('state-warning');
        availability.textContent = `Quedan ${horasDisponibles} horario(s) disponible(s). Los horarios ocupados ya fueron marcados.`;
        renderHeroPanel();
        return;
    }

    availability.classList.add('state-success');
    availability.textContent = 'Todos los horarios están disponibles para esta fecha.';
    renderHeroPanel();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 220);
    }, 2600);
}

function setLoadingState(isLoading) {
    const btn = document.getElementById('confirmar-btn');
    if (!btn) return;

    btn.disabled = isLoading;
    btn.style.opacity = isLoading ? '0.75' : '1';
    btn.style.cursor = isLoading ? 'wait' : 'pointer';
    btn.textContent = isLoading ? 'Confirmando...' : 'Confirmar Reserva';
}

async function realizarReserva() {
    const nombreCliente = (document.getElementById('nombre-cliente')?.value || '').trim();
    const telefono = (document.getElementById('telefono-cliente')?.value || '').trim();
    const reservaTexto = (document.getElementById('reserva-textbox')?.value || '').trim();
    const fechaCumpleanos = document.getElementById('fecha-cumpleanos')?.value || '';
    const yateId = parseInt(document.getElementById('select-yate').value, 10);
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    if (!nombreCliente || nombreCliente.length < 4) {
        showToast('Ingresa el nombre completo del cliente.', 'error');
        return;
    }

    if (normalizePhoneForWhatsApp(telefono).length < 10) {
        showToast('Ingresa un número de contacto válido.', 'error');
        return;
    }

    const birthdayError = validateBirthday(fechaCumpleanos);
    if (birthdayError) {
        showToast(birthdayError, 'error');
        return;
    }

    if (!yateId || !fecha || !hora) {
        showToast('Completa todos los campos antes de confirmar.', 'error');
        return;
    }

    if (!reservaTexto) {
        showToast('Confirma la lancha o yate en el campo de reserva.', 'error');
        return;
    }

    const yate = yates.find(y => y.id === yateId);
    const embarcacionReservada = reservaTexto || yate.nombre;

    try {
        setLoadingState(true);

        const snapshot = await db.collection('reservas')
            .where('yateId', '==', yateId)
            .where('fecha', '==', fecha)
            .where('hora', '==', hora)
            .get();

        if (!snapshot.empty) {
            showToast('Ese horario ya fue reservado. Elige otro.', 'error');
            setLoadingState(false);
            actualizarDisponibilidad();
            return;
        }

        const reservaRef = db.collection('reservas').doc();
        const payload = {
            reservationId: reservaRef.id,
            nombreCliente,
            telefono,
            fechaCumpleanos,
            reserva: embarcacionReservada,
            embarcacionReservada,
            yate: embarcacionReservada,
            yateId,
            fecha,
            hora,
            crm: {
                status: 'new',
                crmStage: 'reservation_requested',
                source: 'website',
                channel: 'reservation_modal',
                deviceType: getCRMDeviceType(),
                tracking: trackingSnapshot
            },
            status: 'new',
            crmStage: 'reservation_requested',
            source: 'website',
            tracking: trackingSnapshot,
            whatsappLink: getWhatsAppLink({ nombreCliente, telefono, yate: embarcacionReservada, fecha, hora }),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await reservaRef.set(payload);

        trackLeadEvent({
            value: 1,
            currency: 'MXN',
            item_name: embarcacionReservada
        });

        hydrateWhatsAppLinks();
        document.getElementById('modal-whatsapp-link')?.setAttribute('href', payload.whatsappLink);

        showToast(`Reserva confirmada para ${embarcacionReservada} a las ${formatHourLabel(hora)}.`, 'success');
        limpiarFormularioReserva();
        cerrarModal();
    } catch (error) {
        console.error('Error al guardar la reserva:', error);
        showToast('Ocurrió un error al guardar la reserva.', 'error');
    } finally {
        setLoadingState(false);
    }
}

async function cancelarReserva(docId) {
    if (confirm('¿Cancelar esta reserva?')) {
        try {
            await db.collection('reservas').doc(docId).delete();
            showToast('Reserva cancelada correctamente.', 'success');
        } catch (error) {
            console.error('Error al cancelar la reserva:', error);
            showToast('No se pudo cancelar la reserva.', 'error');
        }
    }
}

function syncReservaTextboxFromSelect() {
    const input = document.getElementById('reserva-textbox');
    const select = document.getElementById('select-yate');
    if (!input || !select) return;

    const yate = yates.find(y => Number(y.id) === Number(select.value));
    input.value = yate ? yate.nombre : '';
}

function seleccionarYate(id) {
    yateSeleccionado = id;
    const select = document.getElementById('select-yate');
    if (select) {
        select.value = String(id);
        syncReservaTextboxFromSelect();
        actualizarDisponibilidad();
    }
}

function llenarSelectorYates() {
    const select = document.getElementById('select-yate');
    if (!select) return;

    const valorActual = select.value;
    select.innerHTML = '<option value="">Elige un yate o lancha...</option>';

    yates.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.id;
        opt.textContent = `${y.nombre} - ${y.tipo} - ${y.precio}`;
        select.appendChild(opt);
    });

    if (yateSeleccionado) {
        select.value = String(yateSeleccionado);
    } else if (valorActual) {
        select.value = valorActual;
    }

    syncReservaTextboxFromSelect();
}

function initFlatpickr() {
    if (fechaPicker) fechaPicker.destroy();
    if (cumpleanosPicker) cumpleanosPicker.destroy();

    fechaPicker = flatpickr('#fecha', {
        locale: 'es',
        minDate: 'today',
        dateFormat: 'd F Y',
        disableMobile: true,
        onChange: () => actualizarDisponibilidad()
    });

    cumpleanosPicker = flatpickr('#fecha-cumpleanos', {
        locale: 'es',
        maxDate: 'today',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd F Y',
        disableMobile: true
    });
}

function abrirModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;

    llenarSelectorYates();
    syncReservaTextboxFromSelect();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('modal-open');
    actualizarDisponibilidad();
    trackReserveIntent();
}

function limpiarFormularioReserva() {
    const nombre = document.getElementById('nombre-cliente');
    const telefono = document.getElementById('telefono-cliente');
    const cumple = document.getElementById('fecha-cumpleanos');
    const select = document.getElementById('select-yate');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');

    if (nombre) nombre.value = '';
    if (telefono) telefono.value = '';
    if (cumple) cumple.value = '';
    if (select) select.value = yateSeleccionado ? String(yateSeleccionado) : '';
    if (fecha) fecha.value = '';
    if (hora) hora.value = '';
    if (cumpleanosPicker) cumpleanosPicker.clear();
    if (fechaPicker) fechaPicker.clear();
}

function cerrarModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.classList.remove('modal-open');
}

function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
}

function closeMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    menu.classList.add('hidden');
}

function updateNavbarOnScroll() {
    const nav = document.getElementById('premium-nav');
    if (!nav) return;

    if (window.scrollY > 24) {
        nav.classList.add('nav-scrolled');
    } else {
        nav.classList.remove('nav-scrolled');
    }
}

function setupInteractions() {
    document.getElementById('select-yate')?.addEventListener('change', (event) => {
        yateSeleccionado = event.target.value ? Number(event.target.value) : null;
        syncReservaTextboxFromSelect();
        actualizarDisponibilidad();
    });

    document.getElementById('hora')?.addEventListener('change', actualizarDisponibilidad);

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', () => closeMenu());
    });

    document.getElementById('modal')?.addEventListener('click', (event) => {
        if (event.target.id === 'modal') {
            cerrarModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            cerrarModal();
            closeMenu();
        }
    });

    window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
    window.addEventListener('resize', renderHeroPanel, { passive: true });
    updateNavbarOnScroll();
}

window.addEventListener('DOMContentLoaded', async () => {
    trackingSnapshot = captureTrackingParams();
    hydrateWhatsAppLinks();
    await Promise.all([initGoogleTag(), initMetaPixel()]);
    renderFlota();
    initFlatpickr();
    renderHeroPanel();
    cargarReservas();
    setupInteractions();
    actualizarDisponibilidad();
    actualizarResumenReservas();
});
