import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';
import { authenticatedFetch } from '../config/authenticatedFetch';

export interface Product {
    id: string;
    name: string;
    brand: string;
    size: string;
    price: number;
    unit: string;
    weight?: string;
    icon?: string;
}

export interface NishaSubcategory {
    id: string;
    name: string;
    icon: string;
}

export const DEFAULT_NISHA_PRODUCTS: Product[] = [
    { id: 'gn-500ml', name: 'Groundnut Oil', brand: 'Nisha', size: '500 ml', price: 110, unit: 'Litre', icon: '🥜' },
    { id: 'gn-1l-pet', name: 'Groundnut Oil', brand: 'Nisha', size: '1 ltr', price: 220, unit: 'Litre', icon: '🥜' },
    { id: 'gn-2l', name: 'Groundnut Oil', brand: 'Nisha', size: '2 ltr', price: 440, unit: 'Litre', icon: '🥜' },
    { id: 'gn-5l-can', name: 'Groundnut Oil', brand: 'Nisha', size: '5 Ltr Can', price: 1100, unit: 'CAN', icon: '🥜' },
    { id: 'gn-5l-can-r', name: 'Groundnut Oil (R)', brand: 'Nisha', size: '5 Ltr Can', price: 1100, unit: 'CAN', icon: '🥜' },
    { id: 'gn-5kg-can', name: 'Groundnut Oil', brand: 'Nisha', size: '5 Kg Can', price: 1245, unit: 'CAN', icon: '🥜' },
    { id: 'gn-15l', name: 'Groundnut Oil', brand: 'Nisha', size: '15 LTR', price: 3260, unit: 'Litre', icon: '🥜' },
    { id: 'gn-15kg', name: 'Groundnut Oil', brand: 'Nisha', size: '15 KG', price: 3530, unit: 'KG', icon: '🥜' },

    { id: 'cn-100ml', name: 'Coconut Oil', brand: 'Nisha', size: '100 ml', price: 38, unit: 'Litre', icon: '🥥' },
    { id: 'cn-200ml', name: 'Coconut Oil', brand: 'Nisha', size: '200 ml', price: 74, unit: 'Litre', icon: '🥥' },
    { id: 'cn-500ml', name: 'Coconut Oil', brand: 'Nisha', size: '500 ml', price: 175, unit: 'Litre', icon: '🥥' },
    { id: 'cn-1l-pet', name: 'Coconut Oil', brand: 'Nisha', size: '1 ltr', price: 350, unit: 'Litre', icon: '🥥' },
    { id: 'cn-5l-can', name: 'Coconut Oil', brand: 'Nisha', size: '5 Ltr Can', price: 1750, unit: 'CAN', icon: '🥥' },
    { id: 'cn-15l', name: 'Coconut Oil', brand: 'Nisha', size: '15 LTR', price: 5175, unit: 'Litre', icon: '🥥' },
    { id: 'cn-15kg', name: 'Coconut Oil', brand: 'Nisha', size: '15 KG', price: 5642.5, unit: 'KG', icon: '🥥' },

    { id: 'cs-100ml', name: 'Castor Oil', brand: 'Nisha', size: '100 ml', price: 29, unit: 'Litre', icon: '🌿' },
    { id: 'cs-200ml', name: 'Castor Oil', brand: 'Nisha', size: '200 ml', price: 56, unit: 'Litre', icon: '🌿' },
    { id: 'cs-500ml', name: 'Castor Oil', brand: 'Nisha', size: '500 ml', price: 130, unit: 'Litre', icon: '🌿' },
    { id: 'cs-1l-pet', name: 'Castor Oil', brand: 'Nisha', size: '1 ltr', price: 260, unit: 'Litre', icon: '🌿' },
    { id: 'cs-5l-can', name: 'Castor Oil', brand: 'Nisha', size: '5 Ltr Can', price: 1300, unit: 'CAN', icon: '🌿' },
    { id: 'cs-15l', name: 'Castor Oil', brand: 'Nisha', size: '15 LTR', price: 3825, unit: 'Litre', icon: '🌿' },
    { id: 'cs-15kg', name: 'Castor Oil', brand: 'Nisha', size: '15 KG', price: 4157.5, unit: 'KG', icon: '🌿' },

    { id: 'lo-100ml', name: 'Lamp oil', brand: 'Nisha', size: '100 ml', price: 18, unit: 'Litre', icon: '🪔' },
    { id: 'lo-200ml', name: 'Lamp oil', brand: 'Nisha', size: '200 ml', price: 34, unit: 'Litre', icon: '🪔' },
    { id: 'lo-500ml', name: 'Lamp oil', brand: 'Nisha', size: '500 ml', price: 75, unit: 'Litre', icon: '🪔' },
    { id: 'lo-1l-pet', name: 'Lamp oil', brand: 'Nisha', size: '1 ltr', price: 150, unit: 'Litre', icon: '🪔' },
    { id: 'lo-5l-can', name: 'Lamp oil', brand: 'Nisha', size: '5 Ltr Can', price: 750, unit: 'CAN', icon: '🪔' },
    { id: 'lo-15l', name: 'Lamp oil', brand: 'Nisha', size: '15 LTR', price: 2100, unit: 'Litre', icon: '🪔' },
    { id: 'lo-15kg', name: 'Lamp oil', brand: 'Nisha', size: '15 KG', price: 2250, unit: 'KG', icon: '🪔' },

    { id: 'gg-100ml', name: 'Gingelly Oil', brand: 'Nisha', size: '100 ml', price: 38, unit: 'Litre', icon: '🏺' },
    { id: 'gg-200ml', name: 'Gingelly Oil', brand: 'Nisha', size: '200 ml', price: 74, unit: 'Litre', icon: '🏺' },
    { id: 'gg-500ml', name: 'Gingelly Oil', brand: 'Nisha', size: '500 ml', price: 175, unit: 'Litre', icon: '🏺' },
    { id: 'gg-1l-pet', name: 'Gingelly Oil', brand: 'Nisha', size: '1 ltr', price: 350, unit: 'Litre', icon: '🏺' },
    { id: 'gg-5l-can', name: 'Gingelly Oil', brand: 'Nisha', size: '5 Ltr Can', price: 1750, unit: 'CAN', icon: '🏺' },
    { id: 'gg-15l', name: 'Gingelly Oil', brand: 'Nisha', size: '15 LTR', price: 5175, unit: 'Litre', icon: '🏺' },
    { id: 'gg-15kg', name: 'Gingelly Oil', brand: 'Nisha', size: '15 KG', price: 5642.5, unit: 'KG', icon: '🏺' },

    { id: 'mo-100ml', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '100 ml', price: 29, unit: 'Litre', icon: '🌼' },
    { id: 'mo-200ml', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '200 ml', price: 56, unit: 'Litre', icon: '🌼' },
    { id: 'mo-500ml', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '500 ml', price: 130, unit: 'Litre', icon: '🌼' },
    { id: 'mo-1l-pet', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '1 ltr', price: 260, unit: 'Litre', icon: '🌼' },
    { id: 'mo-5l-can', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '5 Ltr Can', price: 1300, unit: 'CAN', icon: '🌼' },
    { id: 'mo-15l', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '15 LTR', price: 3825, unit: 'Litre', icon: '🌼' },
    { id: 'mo-15kg', name: 'Mahua Oil(iluppa ennai)', brand: 'Nisha', size: '15 KG', price: 4157.5, unit: 'KG', icon: '🌼' },

    { id: 'nm-100ml', name: 'Neem Oil', brand: 'Nisha', size: '100 ml', price: 39, unit: 'Litre', icon: '🍃' },
    { id: 'nm-200ml', name: 'Neem Oil', brand: 'Nisha', size: '200 ml', price: 76, unit: 'Litre', icon: '🍃' },
    { id: 'nm-500ml', name: 'Neem Oil', brand: 'Nisha', size: '500 ml', price: 180, unit: 'Litre', icon: '🍃' },
    { id: 'nm-1l-pet', name: 'Neem Oil', brand: 'Nisha', size: '1 ltr', price: 360, unit: 'Litre', icon: '🍃' },
    { id: 'nm-5l-can', name: 'Neem Oil', brand: 'Nisha', size: '5 Ltr Can', price: 1800, unit: 'CAN', icon: '🍃' },
    { id: 'nm-15l', name: 'Neem Oil', brand: 'Nisha', size: '15 LTR', price: 5325, unit: 'Litre', icon: '🍃' },
    { id: 'nm-15kg', name: 'Neem Oil', brand: 'Nisha', size: '15 KG', price: 5807.5, unit: 'KG', icon: '🍃' },

    // Varshini Groundnut Oil
    { id: 'vs-gn-500ml-box', name: 'Varshini Groundnut oil', brand: 'VARSHINI', size: '500 ml box', price: 2200, unit: 'BOX', icon: '🥜' },
    { id: 'vs-gn-1l-box', name: 'Varshini Groundnut oil', brand: 'VARSHINI', size: '1 LTR box', price: 2200, unit: 'BOX', icon: '🥜' },
];

export const DEFAULT_MIXED_OIL_PRODUCTS: Product[] = [
    { id: 'mo-v-0.5po', name: 'Varshini Gold', brand: 'VARSHINI', size: '1/2 Pkt', price: 1500, unit: 'BOX', icon: '🛢️' },
    { id: 'mo-v-1lpo', name: 'Varshini Gold', brand: 'VARSHINI', size: '1 Ltr Pkt', price: 1500, unit: 'BOX', icon: '🛢️' },
    { id: 'mo-v-5lcan', name: 'Varshini Gold (White)', brand: 'VARSHINI', size: '5 Ltr Can', price: 775, unit: 'CAN', icon: '🛢️' },
    { id: 'mo-v-5lcan-y', name: 'Varshini Gold (Yellow)', brand: 'VARSHINI', size: '5 Ltr Can', price: 800, unit: 'CAN', icon: '🛢️' },
    { id: 'mo-v-5lcan-ny', name: 'Varshini Gold (Nisha Yellow)', brand: 'VARSHINI', size: '5 Ltr Can', price: 820, unit: 'CAN', icon: '🛢️' },
    { id: 'mo-v-15l', name: 'Varshini Gold', brand: 'VARSHINI', size: '15 LTR', price: 2230, unit: 'Litre', icon: '🛢️' },
    { id: 'mo-v-15kg', name: 'Varshini Gold', brand: 'VARSHINI', size: '15 KG', price: 2440, unit: 'KG', icon: '🛢️' },
    { id: 'mo-r-0.5lpo', name: 'ROSHINI', brand: 'ROSHINI', size: '1/2 Ltr ', price: 1380, unit: 'BOX', icon: '🛢️' },
    { id: 'mo-r-1lpo', name: 'ROSHINI', brand: 'ROSHINI', size: '1 Ltr ', price: 1380, unit: 'BOX', icon: '🛢️' },
];

export const DEFAULT_PALM_OIL_PRODUCTS: Product[] = [
    { id: 'po-r-850g', name: 'Palm Oil', brand: 'ROSI GOLD', size: '850 GM', price: 1320, unit: 'BOX', icon: '🌴' },
    { id: 'po-r-820g', name: 'Palm Oil', brand: 'ROSI GOLD', size: '820 GM', price: 1280, unit: 'BOX', icon: '🌴' },
    { id: 'po-r-800g', name: 'Palm Oil', brand: 'ROSI GOLD', size: '800 GM', price: 1250, unit: 'BOX', icon: '🌴' },
    { id: 'po-r-750g', name: 'Palm Oil', brand: 'ROSI GOLD', size: '750 GM', price: 1185, unit: 'BOX', icon: '🌴' },
    { id: 'po-r-15l', name: 'Palm Oil', brand: 'ROSI GOLD', size: '15 LTR', price: 2180, unit: 'Litre', icon: '🌴' },
    { id: 'po-r-15kg', name: 'Palm Oil', brand: 'ROSI GOLD', size: '15 KG', price: 2400, unit: 'KG', icon: '🌴' },
];

export const DEFAULT_BURFI_PRODUCTS: Product[] = [
    { id: 'bu-k-barfi', name: 'Kadalai Burfi', brand: 'Nisha', size: 'JAR', price: 110, unit: 'JAR', icon: '🥜' },
];

export const DEFAULT_OIL_CAKE_PRODUCTS: Product[] = [
    { id: 'oc-thool-25kg', name: 'Thool Cake', brand: 'Nisha', size: '25 KG', price: 1525, unit: 'BAG', icon: '🧱' },
    { id: 'oc-thool-50kg', name: 'Thool Cake', brand: 'Nisha', size: '50 KG', price: 3000, unit: 'BAG', icon: '🧱' },
    { id: 'oc-katti-25kg', name: 'Katti Cake', brand: 'Nisha', size: '25 KG', price: 1500, unit: 'BAG', icon: '🪨' },
    { id: 'oc-katti-50kg', name: 'Katti Cake', brand: 'Nisha', size: '50 KG', price: 2950, unit: 'BAG', icon: '🪨' },
];

export const DEFAULT_NISHA_SUBCATEGORIES: NishaSubcategory[] = [
    { id: 'GN', name: 'Groundnut Oil', icon: '🥜' },
    { id: 'CN', name: 'Coconut Oil', icon: '🥥' },
    { id: 'GG', name: 'Gingelly Oil', icon: '🏺' },
    { id: 'CS', name: 'Castor Oil', icon: '🌿' },
    { id: 'NM', name: 'Neem Oil', icon: '🍃' },
    { id: 'MO', name: 'Mahua Oil(iluppa ennai)', icon: '🌼' },
    { id: 'LO', name: 'Lamp oil', icon: '🪔' },
    { id: 'VS', name: 'Varshini', icon: '🛢️' },
];

/* ── Server Rate Syncing ── */
const SERVER_RATES_KEY = 'serverProductRates_v4';
let cachedServerRates: Record<string, number> = {};

export const fetchAndCacheRatesFromServer = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/products/rates`);
        if (response.ok) {
            const rates = await response.json();
            await AsyncStorage.setItem(SERVER_RATES_KEY, JSON.stringify(rates));
            cachedServerRates = rates;
            return rates;
        }
    } catch (err) {
        console.warn('Failed to refresh product rates from server:', err);
    }
    return null;
};

/**
 * Loads cached rates from AsyncStorage into memory for sync access
 */
export const loadCachedRates = async () => {
    try {
        const stored = await AsyncStorage.getItem(SERVER_RATES_KEY);
        if (stored) cachedServerRates = JSON.parse(stored);
    } catch (e) { }
};

function applyRates(products: Product[]): Product[] {
    return products.map(p => ({
        ...p,
        price: cachedServerRates[p.id] ?? p.price
    }));
}

export const SHOP_CATEGORIES = [
    { id: 'nisha', name: 'Nisha Pure Oils', icon: '🫙', subcategories: DEFAULT_NISHA_SUBCATEGORIES, getProducts: () => applyRates(DEFAULT_NISHA_PRODUCTS) },
    { id: 'mixed', name: 'Varshini Gold', icon: '🛢️', subcategories: [{ id: 'ALL', name: 'All Products', icon: '🛢️' }], getProducts: () => applyRates(DEFAULT_MIXED_OIL_PRODUCTS) },
    { id: 'palm', name: 'Palm Oil', icon: '🌴', subcategories: [{ id: 'ALL', name: 'All Products', icon: '🌴' }], getProducts: () => applyRates(DEFAULT_PALM_OIL_PRODUCTS) },
    { id: 'burfi', name: 'Burfi', icon: '🥜', subcategories: [{ id: 'ALL', name: 'All Products', icon: '🥜' }], getProducts: () => applyRates(DEFAULT_BURFI_PRODUCTS) },
    { id: 'oilcake', name: 'Oil Cake', icon: '🧱', subcategories: [{ id: 'Thool Cake', name: 'Thool Cake', icon: '🧱' }, { id: 'Katti Cake', name: 'Katti Cake', icon: '🪨' }], getProducts: () => applyRates(DEFAULT_OIL_CAKE_PRODUCTS) },
];

export function getAllProducts(): Product[] {
    const baseProducts = [
        ...applyRates(DEFAULT_NISHA_PRODUCTS),
        ...applyRates(DEFAULT_MIXED_OIL_PRODUCTS),
        ...applyRates(DEFAULT_PALM_OIL_PRODUCTS),
        ...applyRates(DEFAULT_BURFI_PRODUCTS),
        ...applyRates(DEFAULT_OIL_CAKE_PRODUCTS)
    ];

    const expanded: Product[] = [];

    for (const product of baseProducts) {
        expanded.push(product);
        const p = product;
        const effectivePrice = product.price;
        const normalSize = p.size.toLowerCase();
        const isNisha = p.brand === 'Nisha';

        if (!isNisha) continue; // Variants only for Nisha oils per business logic

        // 100ml gets Box (50x) and Litre (10x)
        if (normalSize === '100 ml') {
            expanded.push({
                ...p,
                id: p.id + '_box',
                name: p.name, // Keep base name for Title
                size: '1 BOX (50x100ml)',
                price: effectivePrice * 50,
                unit: 'BOX'
            });
            expanded.push({
                ...p,
                id: p.id + '_ltr',
                name: p.name,
                size: '1 LTR (10x100ml)',
                price: effectivePrice * 10,
                unit: 'LTR'
            });
        }

        // 200ml gets Box (25x) and Litre (5x)
        if (normalSize === '200 ml') {
            expanded.push({
                ...p,
                id: p.id + '_box',
                name: p.name,
                size: '1 BOX (25x200ml)',
                price: effectivePrice * 25,
                unit: 'BOX'
            });
            expanded.push({
                ...p,
                id: p.id + '_ltr',
                name: p.name,
                size: '1 LTR (5x200ml)',
                price: effectivePrice * 5,
                unit: 'LTR'
            });
        }

        // 500ml gets Box (20x) and Litre (2x)
        if (normalSize === '500 ml') {
            expanded.push({
                ...p,
                id: p.id + '_box',
                name: p.name,
                size: '1 BOX (20x500ml)',
                price: effectivePrice * 20,
                unit: 'BOX'
            });
            expanded.push({
                ...p,
                id: p.id + '_ltr',
                name: p.name,
                size: '1 LTR (2x500ml)',
                price: effectivePrice * 2,
                unit: 'LTR'
            });
        }

        // 1 Litre gets Box (10x)
        if (normalSize === '1 litre' || normalSize === '1 ltr-pet' || normalSize === '1 ltr') {
            expanded.push({
                ...p,
                id: p.id + '_box',
                name: p.name,
                size: '1 BOX (10x1L)',
                price: effectivePrice * 10,
                unit: 'BOX'
            });
        }

        // 2 Litre gets Box (5x)
        if (normalSize === '2 ltr') {
            expanded.push({
                ...p,
                id: p.id + '_box',
                name: p.name,
                size: '1 BOX (5x2L)',
                price: effectivePrice * 5,
                unit: 'BOX'
            });
        }
    }

    return expanded;
}

/**
 * Centered utility to expand a raw cart into physically accurate items (bottles/boxes).
 */
export function getCartItems(cart: Record<string, number>, customRates?: Record<string, number>): (Product & { quantity: number; price: number })[] {
    const baseProducts = [
        ...applyRates(DEFAULT_NISHA_PRODUCTS),
        ...applyRates(DEFAULT_MIXED_OIL_PRODUCTS),
        ...applyRates(DEFAULT_PALM_OIL_PRODUCTS),
        ...applyRates(DEFAULT_BURFI_PRODUCTS),
        ...applyRates(DEFAULT_OIL_CAKE_PRODUCTS)
    ];

    return baseProducts.flatMap(p => {
        const items = [];
        const isNisha = p.brand === 'Nisha';
        const size = p.size.toLowerCase();

        // Use customRate if provided, otherwise the base product price
        // Important: customRates are per-variant in our store (e.g., customRates['id_box'])
        // But the FE logic stores rates against the BASE product ID often.
        // We'll support both: check variantId first, then base product ID.

        const is100ml = isNisha && size === '100 ml';
        const is200ml = isNisha && size === '200 ml';
        const is500ml = isNisha && size === '500 ml';
        const is1L = isNisha && (size === '1 litre' || size === '1 ltr-pet' || size === '1 ltr');
        const is2L = isNisha && size === '2 ltr';

        // 1. Base Product
        if (cart[p.id]) {
            const quantity = cart[p.id] || 0;
            const rate = customRates?.[p.id] ?? p.price;
            items.push({ ...p, price: rate, quantity });
        }

        // 2. Box Variant
        if (cart[p.id + '_box']) {
            const multiplier = is100ml ? 50 : is200ml ? 25 : is500ml ? 20 : is1L ? 10 : is2L ? 5 : 1;
            // Always derive the box rate dynamically from the base rate 
            // to prevent stale DB variant records from overriding the multiplier.
            const baseRate = customRates?.[p.id] ?? p.price;
            const rate = baseRate * multiplier;
            items.push({
                ...p,
                id: p.id + '_box',
                name: p.name,
                size: is100ml ? '1 BOX (50x100ml)' : is200ml ? '1 BOX (25x200ml)' : is500ml ? '1 BOX (20x500ml)' : is1L ? '1 BOX (10x1L)' : is2L ? '1 BOX (5x2L)' : p.size,
                price: rate,
                quantity: cart[p.id + '_box']
            });
        }

        // 3. Litre Variant (suffix _ltr)
        if (cart[p.id + '_ltr']) {
            const multiplierLtr = is100ml ? 10 : is200ml ? 5 : is500ml ? 2 : 1;
            const quantity = (is100ml || is200ml || is500ml) ? (cart[p.id + '_ltr'] || 0) * multiplierLtr : (cart[p.id + '_ltr'] || 0);

            // Use base rate for the price per piece
            const pieceRate = customRates?.[p.id] ?? p.price;

            items.push({
                ...p,
                id: p.id + '_ltr',
                name: p.name,
                // Display the actual size of the piece (e.g., 500 ml instead of 1 LTR pack)
                size: is100ml ? '100 ml' : is200ml ? '200 ml' : is500ml ? '500 ml' : p.size,
                price: pieceRate,
                quantity: quantity
            });
        }
        return items;
    });
}
