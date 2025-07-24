// Dashboard JavaScript with Socket.IO and modern UI interactions

class DashboardManager {
    constructor() {
        this.socket = io();
        this.currentSession = null;
        this.initializeEventListeners();
        this.initializeSocketEvents();
        this.loadInitialData();
        this.initializeTheme();
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                if (section) {
                    this.showSection(section);
                    this.setActiveNavItem(item);
                }
            });
        });

        // File upload
        const fileInput = document.getElementById('csv-file');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileUpload.bind(this));
        }

        // Upload area drag and drop
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            uploadArea.addEventListener('click', () => fileInput.click());
        }

        // Theme toggle
        document.querySelector('.theme-toggle')?.addEventListener('click', this.toggleTheme.bind(this));

        // Stop automation
        document.getElementById('stop-automation-btn')?.addEventListener('click', this.stopAutomation.bind(this));
    }

    initializeSocketEvents() {
        this.socket.on('automation_log', (data) => {
            this.addLogEntry(data.message);
        });

        this.socket.on('automation_stats', (data) => {
            this.updateSessionStats(data);
        });

        this.socket.on('automation_status', (data) => {
            this.updateSessionStatus(data);
        });
    }

    initializeTheme() {
        const isDark = localStorage.getItem('theme') === 'dark' || 
                      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (isDark) {
            document.documentElement.classList.add('dark');
        }
    }

    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Load section-specific data
        if (sectionName === 'campaigns') {
            this.loadCampaigns();
        } else if (sectionName === 'analytics') {
            this.loadAnalytics();
        }
    }

    setActiveNavItem(activeItem) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    async loadInitialData() {
        await this.loadCampaigns();
        await this.loadAnalytics();
        this.updateDashboardStats();
    }

    async loadCampaigns() {
        try {
            const response = await fetch('/api/campaigns');
            const data = await response.json();
            this.renderCampaigns(data.campaigns);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        }
    }

    renderCampaigns(campaigns) {
        const campaignsList = document.getElementById('campaigns-list');
        if (!campaigns.length) {
            campaignsList.innerHTML = `
                <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                    No campaigns yet. Upload a CSV to get started.
                </div>
            `;
            return;
        }

        campaignsList.innerHTML = campaigns.map(campaign => `
            <div class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0">
                        <i data-feather="file-text" class="h-8 w-8 text-gray-400"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white">${campaign.name}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${campaign.contacts_count} contacts</p>
                        <p class="text-xs text-gray-400 dark:text-gray-500">Created: ${new Date(campaign.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="dashboard.startAutomation(${campaign.id})" class="btn-primary">
                        <i data-feather="play" class="h-4 w-4 mr-2"></i>
                        Start
                    </button>
                    <button onclick="dashboard.deleteCampaign(${campaign.id})" class="btn-secondary text-red-600 hover:text-red-700">
                        <i data-feather="trash-2" class="h-4 w-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        feather.replace();
    }

    async startAutomation(campaignId) {
        try {
            const response = await fetch('/api/start-automation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ campaign_id: campaignId })
            });

            const data = await response.json();
            if (data.success) {
                this.currentSession = data.session_id;
                this.showSection('automation');
                this.setActiveNavItem(document.querySelector('[data-section="automation"]'));
                document.getElementById('stop-automation-btn').classList.remove('hidden');
                this.clearConsole();
                this.addLogEntry('Starting automation...');
            } else {
                alert(data.error || 'Failed to start automation');
            }
        } catch (error) {
            console.error('Failed to start automation:', error);
            alert('Failed to start automation');
        }
    }

    async stopAutomation() {
        if (!this.currentSession) return;

        try {
            const response = await fetch('/api/stop-automation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_id: this.currentSession })
            });

            const data = await response.json();
            if (data.success) {
                this.addLogEntry('Stopping automation...');
            }
        } catch (error) {
            console.error('Failed to stop automation:', error);
        }
    }

    async deleteCampaign(campaignId) {
        if (!confirm('Are you sure you want to delete this campaign?')) return;

        try {
            const response = await fetch(`/api/delete-campaign/${campaignId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                this.loadCampaigns();
            } else {
                alert('Failed to delete campaign');
            }
        } catch (error) {
            console.error('Failed to delete campaign:', error);
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('border-linkedin');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('border-linkedin');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    async uploadFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
        // Fixed: Use correct endpoint
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        // Fixed: Handle correct response format
        if (data.campaign_id) {
            alert(`Upload successful! Campaign created with ${data.contacts} contacts`);
            this.loadCampaigns();
        } else {
            alert(data.error || 'Failed to upload file');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        alert('Upload failed');
    }
}

    showUploadPreview(data) {
        const modal = document.getElementById('upload-modal');
        const preview = document.getElementById('upload-preview');
        const content = document.getElementById('preview-content');

        content.innerHTML = `
            <div class="mb-2"><strong>File:</strong> ${data.filename}</div>
            <div class="mb-2"><strong>Contacts:</strong> ${data.contacts_count}</div>
            <div class="text-xs text-gray-500">
                Preview: ${data.preview.slice(0, 3).map(row => 
                    `${row.Name} - ${row.Company} (${row.Role})`
                ).join(', ')}...
            </div>
        `;

        preview.classList.remove('hidden');
        modal.classList.remove('hidden');
    }

    addLogEntry(message) {
        const console = document.getElementById('automation-console');
        const entry = document.createElement('div');
        entry.textContent = message;
        entry.className = 'mb-1';
        console.appendChild(entry);
        console.scrollTop = console.scrollHeight;
    }

    clearConsole() {
        const console = document.getElementById('automation-console');
        console.innerHTML = '<div class="text-gray-500">Automation console ready...</div>';
    }

    updateSessionStats(stats) {
        document.getElementById('session-processed').textContent = stats.contacts_processed || 0;
        document.getElementById('session-successful').textContent = stats.successful_contacts || 0;
        document.getElementById('session-failed').textContent = stats.failed_contacts || 0;
    }

    updateSessionStatus(status) {
        if (status.status === 'completed' || status.status === 'stopped' || status.status === 'error') {
            document.getElementById('stop-automation-btn').classList.add('hidden');
            this.currentSession = null;
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/analytics');
            const data = await response.json();
            this.updateDashboardStats(data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    updateDashboardStats(data = {}) {
        const totalContacts = data.total_contacts || 0;
        const totalMessages = data.total_messages || 0;
        const successRate = totalContacts > 0 ? Math.round((totalMessages / totalContacts) * 100) : 0;

        document.getElementById('total-contacts').textContent = totalContacts;
        document.getElementById('successful-contacts').textContent = totalMessages;
        document.getElementById('success-rate').textContent = `${successRate}%`;
        document.getElementById('active-sessions').textContent = this.currentSession ? 1 : 0;
    }
}

// Utility functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    menu.classList.toggle('hidden');
}

function showUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
}

function hideUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    document.getElementById('upload-preview').classList.add('hidden');
}

function confirmUpload() {
    hideUploadModal();
}
// Get CSRF token from meta tag
function getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

// Function to upload CSV file
function uploadCSVFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add CSRF token to FormData
    formData.append('csrf_token', getCSRFToken());
    
    fetch('/upload', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken()  // Include in header as well
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        showNotification('Campaign uploaded successfully!', 'success');
        loadCampaigns(); // Refresh campaign list
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
    });
}

// Setup CSRF token for all AJAX requests
document.addEventListener('DOMContentLoaded', function() {
    const csrfToken = getCSRFToken();
    
    // Configure fetch to include CSRF token in all requests
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        if (options.method && options.method.toUpperCase() !== 'GET') {
            options.headers = options.headers || {};
            options.headers['X-CSRFToken'] = csrfToken;
        }
        return originalFetch(url, options);
    };
});


// Initialize dashboard
const dashboard = new DashboardManager();
