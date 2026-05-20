/**
 * Standardizes IST (Indian Standard Time) handling across the app.
 * Backend stores dates as IST MySQL strings (without offset).
 */

export const parseIST = (dateStr: any): Date => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr !== 'string') return new Date(dateStr);
    
    // If it doesn't have an offset (Z or +), it's a backend IST string
    if (!dateStr.includes('Z') && !dateStr.includes('+')) {
        // Standardize format: replace space with T if needed
        let iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
        
        // If it's just a date (YYYY-MM-DD), add a default time
        if (iso.length === 10) {
            iso += 'T00:00:00';
        }
        
        // Mark as IST by appending +05:30
        return new Date(iso + '+05:30');
    }
    
    return new Date(dateStr);
};

export const formatIST = (date: Date | string, options: Intl.DateTimeFormatOptions = {}): string => {
    const d = typeof date === 'string' ? parseIST(date) : date;
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        ...options
    };

    return d.toLocaleString('en-IN', defaultOptions).toUpperCase();
};

export const getTodayIST = (): string => {
    // Returns YYYY-MM-DD in IST
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const toUTCISO = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString();
};
