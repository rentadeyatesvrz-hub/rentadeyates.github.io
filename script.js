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
    { id: 4, nombre: "Percales", tipo: "Lancha", precio: "MX$3,500xh ò MX$16,000/6h", capacidad: "12 personas", incluye: "Capitán,Dos Bolsas de Hielo, Coca-Cola 2L, Combustible, 12 Cerveza, Agua Mineral 2L", img: "https://images.unsplash.com/photo-1776208903634-4aab68769156?q=80&w=1022&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    { id: 5, nombre: "Patrik", tipo: "Lancha", precio: "MX$8,500/8h", capacidad: "Hasta 7 personas", incluye: "Capitán,Dos Bolsas de Hielo,Coca-Cola 2L,Combustible,12 Cerveza,Agua Mineral 2L", img: "https://images.unsplash.com/photo-1778220290071-a2913c39947c?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }
];

// ... (todo el resto del archivo script.js se mantiene exactamente igual, sin ningún otro cambio)
