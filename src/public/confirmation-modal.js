/**
 * Confirmation Modal System
 *
 * A reusable confirmation modal component for the application.
 * Provides beautiful, accessible confirmation dialogs.
 *
 * Usage:
 * 1. Include the CSS: <link rel="stylesheet" href="/confirmation-modal.css" />
 * 2. Include the HTML: <%- include('partials/confirmation-modal') %>
 * 3. Include this script: <script src="/confirmation-modal.js"></script>
 * 4. Initialize: ConfirmationModal.init();
 */

window.ConfirmationModal = (function () {
    'use strict';

    // Private variables
    let currentConfirmationCallback = null;
    let currentForm = null;
    let isInitialized = false;

    // DOM elements (will be cached after init)
    let modal, modalIcon, modalTitle, modalMessage, cancelBtn, confirmBtn;

    /**
     * Initialize the confirmation modal system
     */
    function init() {
        if (isInitialized) {
            console.warn('ConfirmationModal: Already initialized');
            return;
        }

        // Cache DOM elements
        modal = document.getElementById('confirmationModal');
        modalIcon = document.getElementById('modalIcon');
        modalTitle = document.getElementById('modalTitle');
        modalMessage = document.getElementById('modalMessage');
        cancelBtn = document.getElementById('modalCancel');
        confirmBtn = document.getElementById('modalConfirm');

        if (!modal) {
            console.error(
                'ConfirmationModal: Modal element not found. Make sure to include the confirmation-modal partial.'
            );
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Auto-detect and initialize forms with confirmations
        initializeConfirmationForms();

        isInitialized = true;
        console.log('ConfirmationModal: Initialized successfully');
    }

    /**
     * Set up event listeners for the modal
     */
    function setupEventListeners() {
        // Close modal on cancel
        cancelBtn.addEventListener('click', hide);

        // Close modal on overlay click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                hide();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                hide();
            }
        });

        // Confirm action
        confirmBtn.addEventListener('click', function () {
            if (currentForm) {
                // Disable the confirmation to prevent double submission
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<span>⏳ Processing...</span>';

                // Submit the form
                currentForm.submit();
            } else if (currentConfirmationCallback) {
                currentConfirmationCallback();
                hide();
            }
        });
    }

    /**
     * Automatically detect and set up forms that need confirmation
     */
    function initializeConfirmationForms() {
        // Delete backup file forms
        document.querySelectorAll('form[action*="/delete/"]').forEach((form) => {
            const fileName = form.action.split('/delete/')[1];
            const decodedFileName = decodeURIComponent(fileName);

            form.addEventListener('submit', function (e) {
                e.preventDefault();
                show({
                    type: 'danger',
                    title: 'Delete Backup File',
                    message: `Are you sure you want to delete the backup file "${decodedFileName}"?<br><br><strong>This action cannot be undone.</strong>`,
                    confirmText: 'Delete File',
                    form: form
                });
            });
        });

        // Delete cron job forms
        document
            .querySelectorAll('form[action*="/cron-jobs/"][action*="/delete"]')
            .forEach((form) => {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    show({
                        type: 'danger',
                        title: 'Delete Cron Job',
                        message:
                            'Are you sure you want to delete this scheduled backup job?<br><br><strong>This will permanently remove the automated backup schedule.</strong>',
                        confirmText: 'Delete Job',
                        form: form
                    });
                });
            });

        // Cleanup backups button
        const cleanupBtn = document.getElementById('cleanupBtn');
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', function (e) {
                e.preventDefault();
                show({
                    type: 'warning',
                    title: 'Cleanup Old Backups',
                    message:
                        'This will permanently delete old backup files according to your cleanup settings.<br><br><strong>Deleted files cannot be recovered.</strong>',
                    confirmText: 'Start Cleanup',
                    callback: function () {
                        // Find the cleanup form and submit it
                        const cleanupForm = document.getElementById('cleanupForm');
                        if (cleanupForm) {
                            cleanupForm.submit();
                        }
                    }
                });
            });
        }
    }

    /**
     * Show the confirmation modal
     * @param {Object} options - Configuration options
     * @param {string} options.type - Modal type: 'danger', 'warning', or 'info'
     * @param {string} options.title - Modal title
     * @param {string} options.message - Modal message (supports HTML)
     * @param {string} options.confirmText - Text for confirm button
     * @param {Function} options.callback - Callback function for confirm action
     * @param {HTMLFormElement} options.form - Form to submit on confirm
     */
    function show(options = {}) {
        if (!isInitialized) {
            console.error(
                'ConfirmationModal: Not initialized. Call ConfirmationModal.init() first.'
            );
            return;
        }

        // Set modal type and content
        const type = options.type || 'info';
        modalIcon.className = `modal-icon ${type}`;

        // Set appropriate icons and styling
        switch (type) {
            case 'danger':
                modalIcon.textContent = '🗑️';
                confirmBtn.className = 'modal-btn modal-btn-confirm';
                break;
            case 'warning':
                modalIcon.textContent = '⚠️';
                confirmBtn.className = 'modal-btn modal-btn-confirm warning';
                break;
            case 'info':
            default:
                modalIcon.textContent = 'ℹ️';
                confirmBtn.className = 'modal-btn modal-btn-confirm info';
                break;
        }

        modalTitle.textContent = options.title || 'Confirm Action';
        modalMessage.innerHTML = options.message || 'Are you sure you want to continue?';
        confirmBtn.innerHTML = `<span>${options.confirmText || 'Confirm'}</span>`;

        // Reset button state
        confirmBtn.disabled = false;

        // Store callback or form
        currentConfirmationCallback = options.callback || null;
        currentForm = options.form || null;

        // Show modal with animation
        modal.classList.add('show');

        // Focus the confirm button for keyboard navigation
        setTimeout(() => {
            confirmBtn.focus();
        }, 100);
    }

    /**
     * Hide the confirmation modal
     */
    function hide() {
        if (!isInitialized) return;

        modal.classList.remove('show');

        // Reset state
        currentConfirmationCallback = null;
        currentForm = null;
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span>Confirm</span>';
    }

    /**
     * Check if modal is currently visible
     * @returns {boolean}
     */
    function isVisible() {
        return isInitialized && modal && modal.classList.contains('show');
    }

    /**
     * Reinitialize forms (useful for dynamically added content)
     */
    function reinitializeForms() {
        if (isInitialized) {
            initializeConfirmationForms();
        }
    }

    // Public API
    return {
        init: init,
        show: show,
        hide: hide,
        isVisible: isVisible,
        reinitializeForms: reinitializeForms
    };
})();

// Auto-initialize when DOM is ready (if not already initialized manually)
document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.ConfirmationModal !== 'undefined' && !window.ConfirmationModal.isVisible()) {
        // Small delay to ensure other scripts have loaded
        setTimeout(function () {
            if (document.getElementById('confirmationModal')) {
                window.ConfirmationModal.init();
            }
        }, 100);
    }
});
