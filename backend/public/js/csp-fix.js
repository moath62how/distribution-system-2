// CSP Compliance - Event Delegation System
// This file removes the need for inline event handlers

document.addEventListener('DOMContentLoaded', function() {
    // Global event delegation for CSP compliance
    document.addEventListener('click', function(e) {
        // Handle modal close buttons
        if (e.target.classList.contains('modal-close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                if (typeof closeModal === 'function') {
                    closeModal(modal.id);
                } else {
                    modal.style.display = 'none';
                }
            }
        }
        
        // Handle cancel buttons in modals
        if (e.target.textContent === 'إلغاء' && e.target.classList.contains('btn-secondary')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                if (typeof closeModal === 'function') {
                    closeModal(modal.id);
                } else {
                    modal.style.display = 'none';
                }
            }
        }
        
        // Handle report generation buttons
        if (e.target.textContent == ('إنشاء تقرير التوريدات') || e.target.textContent == ('إنشاء تقرير المشاوير')) {
            if (typeof generateDeliveriesReport === 'function') {
                generateDeliveriesReport();
            }
        }
        
        if (e.target.textContent == ('إنشاء كشف الحساب')) {
            if (typeof generateAccountStatement === 'function') {
                generateAccountStatement();
            }
        }
        
        // Handle filter clear buttons
        if (e.target.textContent === 'مسح الفلاتر') {
            const section = e.target.closest('[id*="Section"]') || e.target.closest('.section');
            if (section) {
                const sectionId = section.id;
                if (sectionId.includes('deliveries') && typeof clearDeliveriesFilters === 'function') {
                    clearDeliveriesFilters();
                } else if (sectionId.includes('payments') && typeof clearPaymentsFilters === 'function') {
                    clearPaymentsFilters();
                } else if (sectionId.includes('adjustments') && typeof clearAdjustmentsFilters === 'function') {
                    clearAdjustmentsFilters();
                }
            }
        }
        
        // Handle date range toggle
        if (e.target.id === 'useCustomDateRange' && typeof toggleDateInputs === 'function') {
            toggleDateInputs();
        }
    });
    
    // Handle change events for date range checkbox
    document.addEventListener('change', function(e) {
        if (e.target.id === 'useCustomDateRange' && typeof toggleDateInputs === 'function') {
            toggleDateInputs();
        }
    });
});

// Utility functions for modal management
if (typeof showModal === 'undefined') {
    window.showModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    };
}

if (typeof closeModal === 'undefined') {
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    };
}

// Make functions globally available
window.showModal = showModal;
window.closeModal = closeModal;