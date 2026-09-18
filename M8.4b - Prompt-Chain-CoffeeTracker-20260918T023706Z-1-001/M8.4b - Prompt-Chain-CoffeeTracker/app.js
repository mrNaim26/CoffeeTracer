// Coffee Tracker App
class CoffeeTracker {
    constructor() {
        this.coffees = this.loadCoffees();
        this.init();
    }

    init() {
        // Event listeners
        document.getElementById('coffeeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCoffee();
        });

        document.getElementById('clearHistory').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all coffee history?')) {
                this.clearAllCoffees();
            }
        });

        // Initial render
        this.updateStats();
        this.renderCoffeeList();
    }

    addCoffee() {
        const type = document.getElementById('coffeeType').value;
        const notes = document.getElementById('coffeeNotes').value;
        const price = parseFloat(document.getElementById('coffeePrice').value) || 0;
        
        const coffee = {
            id: Date.now(),
            type: type,
            notes: notes,
            price: price,
            timestamp: new Date().toISOString()
        };

        this.coffees.unshift(coffee);
        this.saveCoffees();
        this.updateStats();
        this.renderCoffeeList();

        // Reset form
        document.getElementById('coffeeForm').reset();
        
        // Show success feedback
        this.showNotification('Coffee added! ☕');
    }

    deleteCoffee(id) {
        this.coffees = this.coffees.filter(coffee => coffee.id !== id);
        this.saveCoffees();
        this.updateStats();
        this.renderCoffeeList();
        this.showNotification('Coffee removed');
    }

    clearAllCoffees() {
        this.coffees = [];
        this.saveCoffees();
        this.updateStats();
        this.renderCoffeeList();
        this.showNotification('All coffee history cleared');
    }

    updateStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayCount = this.coffees.filter(coffee => {
            const coffeeDate = new Date(coffee.timestamp);
            return coffeeDate >= today;
        }).length;

        const weekCount = this.coffees.filter(coffee => {
            const coffeeDate = new Date(coffee.timestamp);
            return coffeeDate >= weekAgo;
        }).length;

        const totalCount = this.coffees.length;

        const totalSpent = this.coffees.reduce((sum, coffee) => {
            return sum + (coffee.price || 0);
        }, 0);

        document.getElementById('todayCount').textContent = todayCount;
        document.getElementById('weekCount').textContent = weekCount;
        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('totalSpent').textContent = `$${totalSpent.toFixed(2)}`;
    }

    renderCoffeeList() {
        const coffeeList = document.getElementById('coffeeList');
        
        if (this.coffees.length === 0) {
            coffeeList.innerHTML = `
                <div class="empty-state">
                    <p>No coffee logged yet. Add your first cup!</p>
                </div>
            `;
            return;
        }

        coffeeList.innerHTML = this.coffees.map(coffee => {
            const date = new Date(coffee.timestamp);
            const formattedTime = this.formatTime(date);
            
            return `
                <div class="coffee-item">
                    <div class="coffee-info">
                        <div class="coffee-type">${coffee.type}${coffee.price ? ` - <span class="coffee-price">$${coffee.price.toFixed(2)}</span>` : ''}</div>
                        <div class="coffee-time">${formattedTime}</div>
                        ${coffee.notes ? `<div class="coffee-notes">${coffee.notes}</div>` : ''}
                    </div>
                    <button class="btn-delete" onclick="tracker.deleteCoffee(${coffee.id})">Delete</button>
                </div>
            `;
        }).join('');
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

    showNotification(message) {
        // Simple notification (you could enhance this with a toast library)
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
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

    saveCoffees() {
        localStorage.setItem('coffees', JSON.stringify(this.coffees));
    }

    loadCoffees() {
        const saved = localStorage.getItem('coffees');
        return saved ? JSON.parse(saved) : [];
    }
}

// Add animations
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

// Initialize the app
const tracker = new CoffeeTracker();
