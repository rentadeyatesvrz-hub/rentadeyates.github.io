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
    { id: 3, nombre: "Monky", tipo: "Lancha", precio: "MX$8,000/8h", capacidad: "10 personas", incluye: "Capitán,Dos Bolsas de Hielo, Coca-Cola 2L, Combustible, 12 Cerveza, Agua Mineral 2L", img: "https://images.unsplash.com/photo-1777789777463-01635c7ed8aa?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 4, nombre: "Percales", tipo: "Lancha", precio: "MX$3,500xh ò MX$16,000/6h", capacidad: "12 personas", incluye: "Capitán,Dos Bolsas de Hielo, Coca-Cola 2L, Combustible, 12 Cerveza, Agua Mineral 2L", img: "https://images.unsplash.com/photo-1776208903634-4aab68769156?q=80&w=1022&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 5, nombre: "Patrik", tipo: "Lancha", precio: "MX$8,500/8h", capacidad: "Hasta 7 personas", incluye: "Capitán,Dos Bolsas de Hielo,Coca-Cola 2L,Combustible,12 Cerveza,Agua Mineral 2L", img: "https://images.unsplash.com/photo-1778220290071-a2913c39947c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }
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

// ... (todo el resto del código es exactamente igual al que tenías, sin ningún cambio)

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
                <img src="${y.img}" alt="Renta de ${escapeHtml(y.tipo)} ${escapeHtml(y.nombre)} en Veracruz" class="w-full h-full object-cover">
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
    // Restricción: Si la lancha/yate ya tiene cualquier reserva ese día, se ocupa por completo
    const tieneReserva = reservas.some(r => Number(r.yateId) === Number(yateId) && r.fecha === fecha);
    if (tieneReserva) {
        // Bloquear todos los horarios
        return ['10:00', '11:00', '12:00', '13:00'];
    }
    return [];
}

function actualizarDisponibilidad() {
    if (fechaPicker) fechaPicker.redraw();
    const yateId = parseInt(document.getElementById('select-yate')?.value || '', 10);
    const fecha = document.getElementById('fecha')?.value || '';
    const horaSelect = document.getElementById('hora');
    const availability = document.getElementById('availability-status');

    if (!horaSelect || !availability) {
        renderHeroPanel();
        return;
    }

    if (!fecha) {
        availability.classList.remove('state-warning', 'state-danger', 'state-success');
        availability.textContent = 'Selecciona una embarcación y una fecha para ver horarios disponibles.';
        renderHeroPanel();
        return;
    }

    // 1. Obtener la disponibilidad de TODA la flota para esta fecha
    const reservedYatesIds = new Set();
    reservas.forEach(r => {
        if (r.fecha === fecha && r.yateId) {
            reservedYatesIds.add(Number(r.yateId));
        }
    });

    const disponiblesHoyYates = yates.filter(y => !reservedYatesIds.has(Number(y.id)));
    const totalDisponibles = disponiblesHoyYates.length;

    // 2. Si no hay yate seleccionado aún
    if (isNaN(yateId) || yateId <= 0) {
        availability.classList.remove('state-warning', 'state-danger', 'state-success');
        
        if (totalDisponibles === 0) {
            availability.classList.add('state-danger');
            availability.textContent = 'Todas nuestras embarcaciones (5/5) están ocupadas para este día. Por favor selecciona otra fecha.';
        } else if (totalDisponibles === 1) {
            availability.classList.add('state-warning');
            availability.textContent = `¡Atención! Queda solo 1 lancha disponible para esta fecha: ${disponiblesHoyYates[0].nombre}. Elígela en el menú superior para reservar.`;
        } else {
            availability.classList.add('state-success');
            const nombresDisponibles = disponiblesHoyYates.map(y => y.nombre).join(', ');
            availability.textContent = `Hay ${totalDisponibles} embarcaciones disponibles para esta fecha: ${nombresDisponibles}. Selecciona una para continuar.`;
        }
        
        Array.from(horaSelect.options).forEach(opt => {
            if (opt.value) {
                opt.disabled = true;
                opt.textContent = `${formatHourLabel(opt.value)} (Elige yate primero)`;
            }
        });
        horaSelect.value = '';
        renderHeroPanel();
        return;
    }

    // 3. Si hay yate seleccionado
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

    if (horasDisponibles === 0) {
        availability.classList.add('state-danger');
        
        if (totalDisponibles === 0) {
            availability.textContent = 'Todas nuestras embarcaciones (5/5) están ocupadas para este día. Por favor selecciona otra fecha.';
        } else if (totalDisponibles === 1) {
            availability.textContent = `Esta embarcación ya está ocupada. Solo queda 1 lancha disponible para esta fecha: ${disponiblesHoyYates[0].nombre}. Elígela en el menú superior para reservar.`;
        } else {
            const nombresDisponibles = disponiblesHoyYates.map(y => y.nombre).join(', ');
            availability.textContent = `Esta embarcación ya está ocupada. Quedan ${totalDisponibles} embarcaciones disponibles para esta fecha: ${nombresDisponibles}. Puedes elegir una de ellas en el menú superior.`;
        }
        renderHeroPanel();
        return;
    }

    if (totalDisponibles === 1) {
        availability.classList.add('state-warning');
        availability.textContent = `¡Tu embarcación seleccionada está disponible! (Queda solo 1 lancha disponible para esta fecha: ${yates.find(y => y.id === yateId).nombre}). Todos los horarios listos.`;
    } else {
        availability.classList.add('state-success');
        const otrosDisponibles = disponiblesHoyYates.filter(y => Number(y.id) !== Number(yateId)).map(y => y.nombre);
        if (otrosDisponibles.length > 0) {
            availability.textContent = `¡Tu embarcación seleccionada está disponible! Todos los horarios listos. (También disponibles para esta fecha: ${otrosDisponibles.join(', ')}).`;
        } else {
            availability.textContent = '¡Tu de embarcación seleccionada está disponible! Todos los horarios listos.';
        }
    }
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

function getMarinaInfo(yateId) {
    const id = Number(yateId);
    if (id === 3 || id === 5) {
        return {
            nombre: "Marina Estero 42 (Isla del Amor)",
            ubicacion: "Estero 42, Isla del Amor, Boca del Río / Alvarado, Ver.",
            mapLink: "https://maps.app.goo.gl/w5t29D698mR2Z8x9A"
        };
    } else {
        return {
            nombre: "Marina El Dorado",
            ubicacion: "Blvrd El Dorado 2, Boca del Río / Alvarado, Ver. (Plaza El Dorado)",
            mapLink: "https://maps.app.goo.gl/tBwJgV3D4f1B9Z1A6"
        };
    }
}

async function realizarReserva() {
    const nombreCliente = (document.getElementById('nombre-cliente')?.value || '').trim();
    const telefono = (document.getElementById('telefono-cliente')?.value || '').trim();
    const correo = (document.getElementById('correo-cliente')?.value || '').trim();
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

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    if (!correo || !validateEmail(correo)) {
        showToast('Ingresa un correo electrónico válido para recibir tus instrucciones.', 'error');
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
            .get();

        if (!snapshot.empty) {
            showToast('Esta embarcación ya está reservada para este día. Por favor selecciona otra fecha.', 'error');
            setLoadingState(false);
            actualizarDisponibilidad();
            return;
        }

        const reservaRef = db.collection('reservas').doc();
        const payload = {
            reservationId: reservaRef.id,
            nombreCliente,
            telefono,
            correo,
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

        // --- SISTEMA AUTOMÁTICO DE CORREOS (Firestore /mail collection trigger) ---
        const marina = getMarinaInfo(yateId);
        const siteUrl = window.location.origin || 'https://rentayatesveracruz.mx';
        const inclList = yate.incluye ? yate.incluye.split(',').map(i => i.trim()).filter(Boolean) : [];
        const includesHtml = inclList.map(inc => `
            <li style="margin-bottom: 6px; color: #d4d4d8; font-size: 14px;">
                <span style="color: #fbbf24; margin-right: 8px;">✦</span> ${inc}
            </li>
        `).join('');

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Confirmación de Reserva • Elite Yacht Rentals</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #f4f4f5; -webkit-text-size-adjust: 100%;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617; padding: 20px 10px;">
                    <tr>
                        <td align="center">
                            <!-- Main Container Card -->
                            <table width="100%" class="container" style="max-width: 600px; background-color: #09090b; border: 1px solid #27272a; border-radius: 24px; overflow: hidden; border-collapse: separate;">
                                <!-- Header Logo / Brand -->
                                <tr>
                                    <td align="center" style="padding: 30px 20px; background-color: #09090b; border-bottom: 1px solid #18181b;">
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" style="font-size: 26px; font-weight: bold; letter-spacing: 4px; color: #ffffff; text-transform: uppercase;">
                                                    ⛵ ELITE YACHT
                                                </td>
                                            </tr>
                                            <tr>
                                                <td align="center" style="font-size: 10px; letter-spacing: 6px; color: #fbbf24; text-transform: uppercase; padding-top: 4px; font-weight: 600;">
                                                    Rentals • Veracruz
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Hero Image Block -->
                                <tr>
                                    <td style="padding: 0;">
                                        <img src="${yate.img}" alt="${embarcacionReservada}" width="100%" style="display: block; width: 100%; max-height: 280px; object-fit: cover; border-bottom: 1px solid #27272a;">
                                    </td>
                                </tr>

                                <!-- Welcome Text -->
                                <tr>
                                    <td style="padding: 30px 24px 20px 24px;">
                                        <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff; text-align: center;">
                                            ¡Tu Aventura en el Mar te Espera!
                                        </h1>
                                        <p style="margin-top: 12px; margin-bottom: 0; font-size: 15px; color: #a1a1aa; line-height: 1.6; text-align: center;">
                                            Hola <strong>${nombreCliente}</strong>, nos complace confirmar tu reserva premium. A continuación, encontrarás todos los detalles y las instrucciones exactas de tu embarque.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Details Table Card -->
                                <tr>
                                    <td style="padding: 0 24px 20px 24px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="12" style="background-color: #18181b; border: 1px solid #27272a; border-radius: 16px;">
                                            <tr>
                                                <td width="35%" style="color: #a1a1aa; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Embarcación</td>
                                                <td style="color: #ffffff; font-size: 15px; font-weight: bold;">${embarcacionReservada} (${yate.tipo})</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #a1a1aa; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Fecha Paseo</td>
                                                <td style="color: #ffffff; font-size: 15px; font-weight: bold;">${fecha}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #a1a1aa; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Hora Salida</td>
                                                <td style="color: #fbbf24; font-size: 15px; font-weight: bold;">${formatHourLabel(hora)} (Favor de llegar 15 min antes)</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Departure Marina (Google Maps Pin integration) -->
                                <tr>
                                    <td style="padding: 0 24px 25px 24px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="16" style="background-color: #1e1b4b; border: 1px solid #312e81; border-radius: 16px;">
                                            <tr>
                                                <td>
                                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                        <tr>
                                                            <td width="32" valign="top">
                                                                <img src="${siteUrl}/pin-mapa.png" alt="Ubicación" width="24" height="24" style="display: block;">
                                                            </td>
                                                            <td style="padding-left: 10px;">
                                                                <h3 style="margin: 0; font-size: 16px; color: #ffffff; font-weight: bold;">
                                                                    Punto de Salida: ${marina.nombre}
                                                                </h3>
                                                                <p style="margin-top: 6px; margin-bottom: 12px; font-size: 13px; color: #c084fc; line-height: 1.5;">
                                                                    ${marina.ubicacion}
                                                                </p>
                                                                <table border="0" cellspacing="0" cellpadding="0">
                                                                    <tr>
                                                                        <td style="background-color: #fbbf24; border-radius: 8px;">
                                                                            <a href="${marina.mapLink}" target="_blank" style="padding: 10px 16px; font-size: 13px; font-weight: bold; color: #09090b; text-decoration: none; display: inline-block;">
                                                                                📍 Abrir en Google Maps
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Inclusions List -->
                                ${includesHtml ? `
                                <tr>
                                    <td style="padding: 0 24px 25px 24px;">
                                        <h3 style="margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff;">¿Qué incluye tu servicio?</h3>
                                        <ul style="margin: 0; padding-left: 0; list-style-type: none;">
                                            ${includesHtml}
                                        </ul>
                                    </td>
                                </tr>
                                ` : ''}

                                <!-- Assistence / Human Contact Details -->
                                <tr>
                                    <td style="padding: 25px 24px; background-color: #18181b; border-top: 1px solid #27272a; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                                            ¿Necesitas ayuda o hablar con un asesor humano? 👨‍✈️
                                        </p>
                                        <p style="margin-top: 8px; margin-bottom: 0; font-size: 15px; font-weight: bold;">
                                            Contacto Directo: 
                                            <a href="tel:+522295202785" style="color: #fbbf24; text-decoration: none; margin-left: 5px;">+52 229 520 2785</a>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer Copyright -->
                                <tr>
                                    <td align="center" style="padding: 20px 24px; background-color: #09090b; font-size: 11px; color: #52525b; border-top: 1px solid #18181b;">
                                        © 2026 Elite Yacht Rentals • Veracruz, México • Paseos de Lujo Privados
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        await db.collection('mail').add({
            to: correo,
            message: {
                subject: `Confirmación de tu Reserva: ${embarcacionReservada} ⛵`,
                html: emailHtml
            }
        });

        trackLeadEvent({
            value: 1,
            currency: 'MXN',
            item_name: embarcacionReservada
        });

        hydrateWhatsAppLinks();
        document.getElementById('modal-whatsapp-link')?.setAttribute('href', payload.whatsappLink);

        showToast(`Reserva confirmada para ${embarcacionReservada} a las ${formatHourLabel(hora)}. Se envió la confirmación a tu correo.`, 'success');
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

    fechaPicker = flatpickr('#inline-calendar', {
        inline: true,
        locale: 'es',
        minDate: 'today',
        dateFormat: 'd F Y',
        onChange: (selectedDates, dateStr) => {
            const fechaInput = document.getElementById('fecha');
            if (fechaInput) {
                fechaInput.value = dateStr;
            }
            actualizarFleetPanel(dateStr);
            actualizarDisponibilidad();
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const dateStr = fp.formatDate(dayElem.dateObj, 'd F Y');
            const today = new Date();
            today.setHours(0,0,0,0);
            const checkDate = new Date(dayElem.dateObj);
            checkDate.setHours(0,0,0,0);

            if (checkDate < today) return;

            // Obtener disponibilidad de la flota para esta fecha
            const reservedYatesIds = new Set();
            reservas.forEach(r => {
                if (r.fecha === dateStr && r.yateId) {
                    reservedYatesIds.add(Number(r.yateId));
                }
            });

            // Crear y agregar el contenedor de 5 puntos
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'day-dots-container';

            // Tenemos 5 lanchas con IDs de 1 a 5
            for (let i = 1; i <= 5; i++) {
                const dot = document.createElement('span');
                const isReserved = reservedYatesIds.has(i);
                dot.className = `day-dot ${isReserved ? 'dot-booked' : 'dot-free'}`;
                dotsContainer.appendChild(dot);
            }

            dayElem.appendChild(dotsContainer);

            const disponiblesHoyCount = yates.filter(y => !reservedYatesIds.has(Number(y.id))).length;

            if (disponiblesHoyCount === 0) {
                dayElem.classList.add('date-occupied');
                dayElem.classList.remove('date-available');
                dayElem.setAttribute('title', 'Todas las lanchas reservadas (5/5)');
            } else {
                dayElem.classList.add('date-available');
                dayElem.classList.remove('date-occupied');
                if (disponiblesHoyCount === 1) {
                    const lastYachtName = yates.filter(y => !reservedYatesIds.has(Number(y.id)))[0]?.nombre || '';
                    dayElem.setAttribute('title', `Solo queda 1 lancha disponible: ${lastYachtName}`);
                } else {
                    const freeNames = yates.filter(y => !reservedYatesIds.has(Number(y.id))).map(y => y.nombre).join(', ');
                    dayElem.setAttribute('title', `${disponiblesHoyCount} lanchas disponibles: ${freeNames}`);
                }
            }
        }
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
    const correo = document.getElementById('correo-cliente');
    const cumple = document.getElementById('fecha-cumpleanos');
    const select = document.getElementById('select-yate');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');

    if (nombre) nombre.value = '';
    if (telefono) telefono.value = '';
    if (correo) correo.value = '';
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
    
    // Only remove modal-open if calendar modal is also closed
    const calendarModal = document.getElementById('calendar-popup-modal');
    if (!calendarModal || calendarModal.classList.contains('hidden')) {
        document.body.classList.remove('modal-open');
    }
}

/* ==================== PREMIUM CALENDAR POP-UP HELPER FUNCTIONS ==================== */

function abrirCalendarModal() {
    const calendarModal = document.getElementById('calendar-popup-modal');
    if (!calendarModal) return;

    calendarModal.classList.remove('hidden');
    calendarModal.classList.add('flex');
    document.body.classList.add('modal-open');

    // If there is already a date selected, highlight it and update panel
    const fechaVal = document.getElementById('fecha')?.value || '';
    if (fechaVal && fechaPicker) {
        fechaPicker.setDate(fechaVal, false);
        actualizarFleetPanel(fechaVal);
    } else {
        // Clear panel message
        const panel = document.getElementById('fleet-availability-panel');
        if (panel) {
            panel.innerHTML = `
                <div class="text-center py-10 text-slate-400">
                    <span class="text-4xl block mb-3">📅</span>
                    Elige una fecha del calendario para ver las lanchas y yates disponibles en tiempo real.
                </div>
            `;
        }
        const display = document.getElementById('selected-date-display');
        if (display) display.textContent = 'Selecciona un día';
    }
    
    if (fechaPicker) {
        fechaPicker.redraw();
    }
}

function cerrarCalendarModal() {
    const calendarModal = document.getElementById('calendar-popup-modal');
    if (!calendarModal) return;

    calendarModal.classList.add('hidden');
    calendarModal.classList.remove('flex');
    
    // Only remove modal-open from body if the main reservation modal is also closed
    const mainModal = document.getElementById('modal');
    if (!mainModal || mainModal.classList.contains('hidden')) {
        document.body.classList.remove('modal-open');
    }
}

function abrirFlujoCalendario() {
    abrirModal();
    abrirCalendarModal();
}

function actualizarFleetPanel(dateStr) {
    const display = document.getElementById('selected-date-display');
    if (display) display.textContent = dateStr;

    const panel = document.getElementById('fleet-availability-panel');
    if (!panel) return;

    // 1. Obtener disponibilidad de la flota para esta fecha
    const reservedYachtIds = new Set();
    reservas.forEach(r => {
        if (r.fecha === dateStr && r.yateId) {
            reservedYachtIds.add(Number(r.yateId));
        }
    });

    const disponiblesHoyYates = yates.filter(y => !reservedYachtIds.has(Number(y.id)));
    const totalDisponibles = disponiblesHoyYates.length;

    // 2. Renderizar tarjetas de la flota
    panel.innerHTML = yates.map(y => {
        const isReserved = reservedYachtIds.has(Number(y.id));
        
        let badgeClass = 'badge-disponible';
        let badgeText = 'Disponible';
        let cardClass = '';
        let buttonText = 'Seleccionar';
        let buttonDisabled = '';
        let subText = '¡Lista para zarpar! Incluye capitán, refrescos, cervezas y combustible.';

        if (isReserved) {
            badgeClass = 'badge-reservada';
            badgeText = 'Reservada';
            cardClass = 'status-booked';
            buttonText = 'Ocupada';
            buttonDisabled = 'disabled';
            subText = 'Esta embarcación ya tiene reserva asignada para este día.';
        } else if (totalDisponibles === 1) {
            badgeClass = 'badge-urgencia';
            badgeText = 'Última Disponible';
            cardClass = 'status-urgencia';
            subText = '🔥 ¡Alta demanda! Es el único yate que queda libre hoy.';
        }

        const includesList = Array.isArray(y.incluye) ? y.incluye : (y.incluye || '').split(',').map(s => s.trim());
        const includesHTML = includesList.slice(0, 3).map(inc => `<span class="include-chip text-[10px] py-0.5 px-2 bg-white/5 border border-white/5 rounded-full">${escapeHtml(inc)}</span>`).join('');

        return `
            <div class="yacht-status-card ${cardClass}">
                <div class="yacht-status-card-img-wrap">
                    <img src="${escapeHtml(y.img)}" alt="${escapeHtml(y.nombre)}" class="yacht-status-card-img" loading="lazy">
                </div>
                <div class="yacht-status-card-info">
                    <div class="flex items-center justify-between gap-2">
                        <h5 class="yacht-status-card-name">${escapeHtml(y.nombre)}</h5>
                        <span class="text-xs font-bold text-amber-300">${escapeHtml(y.precio.split('/')[0] || y.precio)}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(y.tipo)} • ${escapeHtml(y.capacidad)}</p>
                    <span class="yacht-status-card-badge ${badgeClass}">${badgeText}</span>
                    <p class="text-[10px] text-slate-300 mt-2 leading-relaxed">${subText}</p>
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${includesHTML}
                    </div>
                </div>
                <div class="yacht-status-card-action">
                    <button type="button" class="premium-button text-xs py-2 px-3 min-h-0" ${buttonDisabled} onclick="seleccionarYateYFecha(${Number(y.id)}, '${escapeHtml(dateStr)}')">
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function seleccionarYateYFecha(yateId, dateStr) {
    const yate = yates.find(y => Number(y.id) === Number(yateId));
    if (!yate) return;

    // Set values in the main modal form
    const selectYate = document.getElementById('select-yate');
    if (selectYate) {
        selectYate.value = String(yateId);
    }
    const textBox = document.getElementById('reserva-textbox');
    if (textBox) {
        textBox.value = yate.nombre;
    }
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.value = dateStr;
    }

    // Trigger updates
    actualizarDisponibilidad();
    
    // Close the calendar modal
    cerrarCalendarModal();

    // Show visual feedback
    showToast(`Seleccionaste ${yate.nombre} para el ${dateStr}`, 'success');
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

    document.getElementById('calendar-popup-modal')?.addEventListener('click', (event) => {
        if (event.target.id === 'calendar-popup-modal') {
            cerrarCalendarModal();
        }
    });

    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.addEventListener('click', abrirCalendarModal);
        fechaInput.addEventListener('focus', abrirCalendarModal);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            cerrarModal();
            cerrarCalendarModal();
            closeMenu();
        }
    });

    window.addEventListener('scroll', updateNavbarOnScroll, { passive: true });
    window.addEventListener('resize', renderHeroPanel, { passive: true });
    updateNavbarOnScroll();
}

async function getGeoLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const geo = await response.json();
            return {
                country: geo.country_name || 'México',
                country_code: geo.country || 'MX',
                region: geo.region || 'Veracruz',
                city: geo.city || 'Veracruz',
                ip: geo.ip || ''
            };
        }
    } catch (e) {
        console.warn('No se pudo obtener la geolocalización por IP:', e);
    }
    return {
        country: 'México',
        country_code: 'MX',
        region: 'Veracruz',
        city: 'Veracruz',
        ip: ''
    };
}

function getDetailedDeviceType(ua) {
    ua = ua || navigator.userAgent;
    const uaLower = ua.toLowerCase();
    
    // Tablet
    const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(uaLower);
    if (isTablet) {
        if (uaLower.includes('ipad')) return 'iPad / Tablet iOS';
        if (uaLower.includes('android')) return 'Tablet Android';
        return 'Tablet / iPad';
    }
    
    // Mobile
    const isMobile = /mobi|ip(hone|od)|android|blackberry|opera mini|iemobile|webos/i.test(uaLower);
    if (isMobile) {
        if (/iphone|ipod/i.test(uaLower)) return 'Móvil iOS (iPhone)';
        if (/android/i.test(uaLower)) return 'Móvil Android';
        return 'Móvil';
    }
    
    // PC / Laptops
    if (uaLower.includes('windows')) return 'PC (Windows)';
    if (uaLower.includes('macintosh') || uaLower.includes('mac os x')) return 'Laptop / Mac (macOS)';
    if (uaLower.includes('linux')) return 'PC (Linux)';
    
    return 'PC / Laptop (Desktop)';
}

window.addEventListener('DOMContentLoaded', async () => {
    trackingSnapshot = captureTrackingParams();
    trackingSnapshot.device_details = getDetailedDeviceType();
    getGeoLocation().then(geo => {
        trackingSnapshot = { ...trackingSnapshot, ...geo };
    });
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

