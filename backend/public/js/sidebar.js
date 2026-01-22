// Load sidebar into placeholder
document.addEventListener('DOMContentLoaded', function () {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (placeholder) {
        fetch('/sidebar.html')
            .then(response => response.text())
            .then(html => {
                placeholder.innerHTML = html;
                // Initialize sidebar behavior
                initSidebar();
                // Set active link based on current page
                setActiveLink();
            })
            .catch(err => console.error('Failed to load sidebar:', err));
    }
});

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('sidebarHamburger');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', function () {
            sidebar.classList.toggle('open');
        });
        document.body.addEventListener('click', function (e) {
            if (window.innerWidth <= 700 && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && e.target !== hamburger) {
                    sidebar.classList.remove('open');
                }
            }
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 700 && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }
}

function setActiveLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('#sidebar a');

    // Remove active class from all links
    links.forEach(link => link.classList.remove('active'));

    // Determine which link should be active based on current path
    let activeHref = '';
    if (currentPath.includes('clients.html') || currentPath === '/' || currentPath === '/clients.html') {
        activeHref = 'clients.html';
    } else if (currentPath.includes('crushers.html')) {
        activeHref = 'crushers.html';
    } else if (currentPath.includes('contractors.html')) {
        activeHref = 'contractors.html';
    } else if (currentPath.includes('new-entry.html')) {
        activeHref = 'new-entry.html';
    } else if (currentPath.includes('index.html') || currentPath === '/') {
        activeHref = 'index.html';
    }

    // Add active class to the matching link
    links.forEach(link => {
        if (link.getAttribute('href') === activeHref) {
            link.classList.add('active');
        }
    });
}