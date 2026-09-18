class CoffeeTracker {
    constructor() {
        this.storageKey = 'coffeeTrackerData';
        this.legacyStorageKey = 'coffees';
        this.storageVersion = 1;
        this.dailyLimit = 4;
        this.editingCoffeeId = null;
        this.filters = {
            search: '',
            date: 'all',
            sort: 'newest'
        };
        this.startupMessage = '';
        this.storageNeedsMigration = false;
        this.coffees = this.loadCoffees();
        this.init();

        if (this.storageNeedsMigration) {
            this.saveCoffees();
        }

        if (this.startupMessage) {
            this.showNotification(this.startupMessage, '#ff9800');
        }
    }

    init() {
        document.getElementById('coffeeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        document.getElementById('clearHistory').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all coffee history?')) {
                this.clearAllCoffees();
            }
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.cancelEdit();
        });

        document.getElementById('searchCoffee').addEventListener('input', (e) => {
            this.filters.search = e.target.value.trim().toLowerCase();
            this.renderCoffeeList();
        });

        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.filters.date = e.target.value;
            this.renderCoffeeList();
        });

        document.getElementById('sortFilter').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.renderCoffeeList();
        });

        document.getElementById('coffeeList').addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) {
                return;
            }

            const coffeeId = button.dataset.id;
            if (button.dataset.action === 'edit') {
                this.startEdit(coffeeId);
            }

            if (button.dataset.action === 'delete') {
                this.deleteCoffee(coffeeId);
            }
        });

        this.updateStats();
        this.renderCoffeeList();
    }

    handleFormSubmit() {
        this.clearFormError();
        const coffeeData = this.getFormData();

        if (!coffeeData) {
            return;
        }

        if (this.editingCoffeeId) {
            this.updateCoffee(coffeeData);
            return;
        }

        this.coffees.unshift({
            id: this.generateId(),
            type: coffeeData.type,
            notes: coffeeData.notes,
            price: coffeeData.price,
            timestamp: new Date().toISOString()
        });

        this.afterCoffeeChange('Coffee added! ☕');
        this.resetForm();
    }

    getFormData() {
        const type = document.getElementById('coffeeType').value.trim();
        const notes = document.getElementById('coffeeNotes').value.trim();
        const rawPrice = document.getElementById('coffeePrice').value.trim();
        let price = null;

        if (!type) {
            this.showFormError('Please choose a coffee type.');
            return null;
        }

        if (rawPrice !== '') {
            price = Number(rawPrice);

            if (!Number.isFinite(price) || price < 0) {
                this.showFormError('Please enter a valid non-negative price.');
                return null;
            }

            price = Number(price.toFixed(2));
        }

        return { type, notes, price };
    }

    updateCoffee(coffeeData) {
        const coffeeIndex = this.coffees.findIndex((coffee) => coffee.id === this.editingCoffeeId);
        if (coffeeIndex === -1) {
            this.cancelEdit();
            this.showNotification('Coffee entry could not be found', '#ff9800');
            return;
        }

        this.coffees[coffeeIndex] = {
            ...this.coffees[coffeeIndex],
            type: coffeeData.type,
            notes: coffeeData.notes,
            price: coffeeData.price
        };

        this.afterCoffeeChange('Coffee updated! ✨');
        this.resetForm();
    }

    startEdit(id) {
        const coffee = this.coffees.find((entry) => entry.id === id);
        if (!coffee) {
            this.showNotification('Coffee entry could not be found', '#ff9800');
            return;
        }

        this.editingCoffeeId = id;
        document.getElementById('coffeeType').value = coffee.type;
        document.getElementById('coffeePrice').value = coffee.price ?? '';
        document.getElementById('coffeeNotes').value = coffee.notes || '';
        document.getElementById('submitCoffee').textContent = 'Update Coffee';
        document.getElementById('cancelEdit').classList.remove('hidden');
        this.clearFormError();
        document.getElementById('coffeeForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    cancelEdit() {
        this.resetForm();
        this.showNotification('Edit canceled', '#607d8b');
    }

    resetForm() {
        this.editingCoffeeId = null;
        document.getElementById('coffeeForm').reset();
        document.getElementById('submitCoffee').textContent = 'Add Coffee';
        document.getElementById('cancelEdit').classList.add('hidden');
        this.clearFormError();
    }

    deleteCoffee(id) {
        const originalLength = this.coffees.length;
        this.coffees = this.coffees.filter((coffee) => coffee.id !== id);

        if (this.coffees.length === originalLength) {
            return;
        }

        if (this.editingCoffeeId === id) {
            this.resetForm();
        }

        this.afterCoffeeChange('Coffee removed');
    }

    clearAllCoffees() {
        this.coffees = [];
        this.resetForm();
        this.afterCoffeeChange('All coffee history cleared');
    }

    afterCoffeeChange(message) {
        this.saveCoffees();
        this.updateStats();
        this.renderCoffeeList();
        this.showNotification(message);
    }

    updateStats() {
        const now = new Date();
        const today = this.startOfDay(now);
        const weekStart = this.getRollingWindowStart(7);
        const monthStart = this.getRollingWindowStart(30);

        const todayCount = this.coffees.filter((coffee) => new Date(coffee.timestamp) >= today).length;
        const weekCount = this.coffees.filter((coffee) => new Date(coffee.timestamp) >= weekStart).length;
        const totalCount = this.coffees.length;
        const totalSpent = this.sumPrices(this.coffees);
        const weekSpent = this.sumPrices(this.coffees.filter((coffee) => new Date(coffee.timestamp) >= weekStart));
        const monthSpent = this.sumPrices(this.coffees.filter((coffee) => new Date(coffee.timestamp) >= monthStart));
        const daysTracked = this.getTrackedDayCount();
        const avgPerDay = daysTracked ? totalCount / daysTracked : 0;
        const mostCommonType = this.getMostCommonType();

        document.getElementById('todayCount').textContent = todayCount;
        document.getElementById('weekCount').textContent = weekCount;
        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('totalSpent').textContent = this.formatCurrency(totalSpent);
        document.getElementById('avgPerDay').textContent = avgPerDay.toFixed(1);
        document.getElementById('mostCommonType').textContent = mostCommonType || '—';
        document.getElementById('weekSpent').textContent = this.formatCurrency(weekSpent);
        document.getElementById('monthSpent').textContent = this.formatCurrency(monthSpent);
        document.getElementById('insightsSummary').textContent = this.buildInsightsSummary({
            todayCount,
            weekSpent,
            mostCommonType
        });
    }

    renderCoffeeList() {
        const coffeeList = document.getElementById('coffeeList');
        const filteredCoffees = this.getFilteredCoffees();

        if (filteredCoffees.length === 0) {
            coffeeList.innerHTML = this.coffees.length === 0
                ? `
                    <div class="empty-state">
                        <p>No coffee logged yet. Add your first cup!</p>
                    </div>
                `
                : `
                    <div class="empty-state">
                        <p>No coffees match the current filters.</p>
                    </div>
                `;
            return;
        }

        coffeeList.innerHTML = filteredCoffees.map((coffee) => {
            const date = new Date(coffee.timestamp);
            const formattedTime = this.formatTime(date);
            const coffeeType = this.escapeHtml(coffee.type);
            const coffeeNotes = this.escapeHtml(coffee.notes || '');
            const coffeeId = this.escapeHtml(coffee.id);

            return `
                <div class="coffee-item">
                    <div class="coffee-info">
                        <div class="coffee-type">${coffeeType}${coffee.price !== null ? ` - <span class="coffee-price">${this.formatCurrency(coffee.price)}</span>` : ''}</div>
                        <div class="coffee-time">${formattedTime}</div>
                        ${coffeeNotes ? `<div class="coffee-notes">${coffeeNotes}</div>` : ''}
                    </div>
                    <div class="coffee-actions">
                        <button class="btn-secondary btn-edit" data-action="edit" data-id="${coffeeId}">Edit</button>
                        <button class="btn-delete" data-action="delete" data-id="${coffeeId}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFilteredCoffees() {
        const filteredCoffees = this.coffees.filter((coffee) => {
            const searchTarget = `${coffee.type} ${coffee.notes || ''}`.toLowerCase();
            const matchesSearch = !this.filters.search || searchTarget.includes(this.filters.search);
            const matchesDate = this.matchesDateFilter(coffee.timestamp, this.filters.date);
            return matchesSearch && matchesDate;
        });

        return filteredCoffees.sort((a, b) => this.compareCoffees(a, b, this.filters.sort));
    }

    compareCoffees(a, b, sort) {
        if (sort === 'oldest') {
            return new Date(a.timestamp) - new Date(b.timestamp);
        }

        if (sort === 'price-high') {
            return (b.price ?? -1) - (a.price ?? -1);
        }

        if (sort === 'price-low') {
            return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
        }

        if (sort === 'type') {
            return a.type.localeCompare(b.type);
        }

        return new Date(b.timestamp) - new Date(a.timestamp);
    }

    matchesDateFilter(timestamp, filter) {
        if (filter === 'all') {
            return true;
        }

        const coffeeDate = new Date(timestamp);
        const today = this.startOfDay(new Date());

        if (filter === 'today') {
            return coffeeDate >= today;
        }

        const days = filter === 'week' ? 7 : 30;
        const threshold = this.getRollingWindowStart(days);
        return coffeeDate >= threshold;
    }

    getMostCommonType() {
        if (this.coffees.length === 0) {
            return '';
        }

        const counts = this.coffees.reduce((totals, coffee) => {
            totals[coffee.type] = (totals[coffee.type] || 0) + 1;
            return totals;
        }, {});

        return Object.entries(counts).sort((a, b) => {
            if (b[1] === a[1]) {
                return a[0].localeCompare(b[0]);
            }

            return b[1] - a[1];
        })[0][0];
    }

    buildInsightsSummary({ todayCount, weekSpent, mostCommonType }) {
        if (this.coffees.length === 0) {
            return 'Add a coffee to see habit insights.';
        }

        const currentWeekStart = this.getRollingWindowStart(7);
        const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const previousWeekSpent = this.sumPrices(this.coffees.filter((coffee) => {
            const coffeeDate = new Date(coffee.timestamp);
            return coffeeDate >= previousWeekStart && coffeeDate < currentWeekStart;
        }));
        const trendDirection = weekSpent > previousWeekSpent ? 'up' : weekSpent < previousWeekSpent ? 'down' : 'steady';
        const remainingCoffees = Math.max(this.dailyLimit - todayCount, 0);
        const reminder = todayCount >= this.dailyLimit
            ? `You reached your daily goal of ${this.dailyLimit} coffees today.`
            : `${remainingCoffees} coffee${remainingCoffees === 1 ? '' : 's'} left before your daily goal of ${this.dailyLimit}.`;

        return `${mostCommonType || 'Coffee'} is your top choice. Spending is ${trendDirection} this week at ${this.formatCurrency(weekSpent)}. ${reminder}`;
    }

    formatTime(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const coffeeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        let dateStr;
        if (coffeeDate.getTime() === today.getTime()) {
            dateStr = 'Today';
        } else if (coffeeDate.getTime() === yesterday.getTime()) {
            dateStr = 'Yesterday';
        } else {
            dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
    }

    showFormError(message) {
        document.getElementById('formError').textContent = message;
    }

    clearFormError() {
        document.getElementById('formError').textContent = '';
    }

    showNotification(message, backgroundColor = '#4caf50') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    generateId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    saveCoffees() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                version: this.storageVersion,
                coffees: this.coffees
            }));
        } catch (error) {
            this.showNotification('Unable to save coffee history locally', '#f44336');
            return false;
        }

        try {
            localStorage.removeItem(this.legacyStorageKey);
        } catch (error) {
        }

        return true;
    }

    loadCoffees() {
        try {
            const currentData = localStorage.getItem(this.storageKey);
            if (currentData) {
                return this.parseStoredCoffees(currentData);
            }

            const legacyData = localStorage.getItem(this.legacyStorageKey);
            if (!legacyData) {
                return [];
            }

            this.storageNeedsMigration = true;
            this.startupMessage = 'Coffee history upgraded for improved reliability.';
            return this.parseStoredCoffees(legacyData);
        } catch (error) {
            this.startupMessage = 'Saved coffee history was corrupted and has been reset.';
            return [];
        }
    }

    parseStoredCoffees(data) {
        const parsed = JSON.parse(data);
        const coffees = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.coffees) ? parsed.coffees : [];

        if (!Array.isArray(coffees)) {
            throw new Error('Invalid coffee data');
        }

        const seenIds = new Set();

        return coffees
            .map((coffee) => this.sanitizeCoffee(coffee))
            .filter(Boolean)
            .map((coffee) => {
                while (seenIds.has(coffee.id)) {
                    coffee.id = this.generateId();
                }

                seenIds.add(coffee.id);
                return coffee;
            });
    }

    sanitizeCoffee(coffee) {
        if (!coffee || typeof coffee !== 'object') {
            return null;
        }

        const type = typeof coffee.type === 'string' && coffee.type.trim() ? coffee.type.trim() : 'Other';
        const notes = typeof coffee.notes === 'string' ? coffee.notes.trim() : '';
        const timestamp = Number.isNaN(new Date(coffee.timestamp).getTime()) ? new Date().toISOString() : new Date(coffee.timestamp).toISOString();
        const parsedPrice = coffee.price === null || coffee.price === undefined || coffee.price === ''
            ? null
            : Number(coffee.price);
        const price = Number.isFinite(parsedPrice) && parsedPrice >= 0 ? Number(parsedPrice.toFixed(2)) : null;
        const id = typeof coffee.id === 'string' || typeof coffee.id === 'number'
            ? String(coffee.id)
            : this.generateId();

        return {
            id,
            type,
            notes,
            price,
            timestamp
        };
    }

    sumPrices(coffees) {
        return coffees.reduce((sum, coffee) => sum + (coffee.price || 0), 0);
    }

    startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    getRollingWindowStart(days) {
        return new Date(this.startOfDay(new Date()).getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    }

    getTrackedDayCount() {
        if (this.coffees.length === 0) {
            return 0;
        }

        return new Set(
            this.coffees.map((coffee) => this.startOfDay(new Date(coffee.timestamp)).getTime())
        ).size;
    }

    formatCurrency(amount) {
        return `$${amount.toFixed(2)}`;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

const tracker = new CoffeeTracker();
