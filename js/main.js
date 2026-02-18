// Breaks In The Simulation - Main JavaScript
// Smooth scrolling, sticky nav behavior, and subtle interactions

(function() {
  'use strict';

  // Smooth scroll for anchor links
  const smoothScroll = () => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Don't prevent default for just "#" or empty hrefs
        if (href === '#' || href === '') return;
        
        e.preventDefault();
        
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          const headerHeight = document.getElementById('header').offsetHeight;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = targetPosition - headerHeight - 20; // 20px extra padding
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  };

  // Sticky header with fade on scroll
  const stickyHeader = () => {
    const header = document.getElementById('header');
    let lastScrollTop = 0;
    let scrollTimeout;
    
    window.addEventListener('scroll', function() {
      // Clear the timeout if it's already set
      clearTimeout(scrollTimeout);
      
      // Set a timeout to run after scrolling ends
      scrollTimeout = setTimeout(function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hide header when scrolling down, show when scrolling up
        if (scrollTop > lastScrollTop && scrollTop > 100) {
          header.classList.add('hidden');
        } else {
          header.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      }, 50); // Small delay for smoother behavior
    }, false);
  };

  // Form handling with basic validation
  const handleForms = () => {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        const emailInput = this.querySelector('input[type="email"]');
        
        if (emailInput && !isValidEmail(emailInput.value)) {
          e.preventDefault();
          showFormMessage(form, 'Please enter a valid email address.', 'error');
          return;
        }
        
        // If using Formspree or similar service, the form will submit normally
        // You can add additional handling here if needed
      });
    });
  };

  // Email validation helper
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Show form message (success/error)
  const showFormMessage = (form, message, type) => {
    // Remove any existing messages
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `form-message form-message-${type}`;
    messageElement.textContent = message;
    messageElement.style.cssText = `
      margin-top: 1rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      border-radius: 4px;
      ${type === 'error' ? 'background: #fee; color: #c33;' : 'background: #efe; color: #363;'}
    `;
    
    form.appendChild(messageElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageElement.remove();
    }, 5000);
  };

  // Add active state to navigation based on scroll position
  const highlightNavOnScroll = () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('#nav a[href^="#"]');
    
    window.addEventListener('scroll', () => {
      let current = '';
      const scrollPosition = window.pageYOffset + 200; // Offset for better UX
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          current = section.getAttribute('id');
        }
      });
      
      navLinks.forEach(link => {
        link.style.opacity = '0.6';
        if (link.getAttribute('href') === `#${current}`) {
          link.style.opacity = '1';
        }
      });
    });
  };

  // Lazy load images if any are added
  const lazyLoadImages = () => {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  };

  // Add subtle entrance animations for content blocks
  const animateOnScroll = () => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);
    
    // Observe content blocks for fade-in effect
    const blocks = document.querySelectorAll('.content-block, .program-item, .service-item, .wellness-item, .support-item');
    blocks.forEach(block => {
      block.style.opacity = '0';
      block.style.transform = 'translateY(20px)';
      block.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(block);
    });
  };

  // Initialize all functionality when DOM is ready
  const init = () => {
    smoothScroll();
    stickyHeader();
    handleForms();
    highlightNavOnScroll();
    lazyLoadImages();
    animateOnScroll();
    
    console.log('Breaks In The Simulation: Initialized');
  };

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
