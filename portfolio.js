document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".intro_work_item");
  const container = document.querySelector(".intro_work_wrap");
  const tilt = -4; // degrees
  const offset = 0; // px
  let parentRotation = 0;
  let currentIndex = 0;
  let intervalId;
  let direction = 1; // 1 forward, -1 backward

  // Apply initial transforms
  items.forEach((item, i) => {
    item.style.transform = `rotate(${i * tilt}deg) translateY(${i * offset}px)`;
  });

  function cycle() {
    parentRotation += tilt * direction;
    gsap.to(container, {
      rotation: -parentRotation,
      duration: 2,
      ease: "cubic-bezier(0.8, -0.4, 0.5, 1)"
    });

    if (direction === 1) {
      if (currentIndex < items.length) {
        items[currentIndex].classList.add("is-active");
        currentIndex++;
        if (currentIndex === items.length) {
          currentIndex = items.length - 1;
          direction = -1;
        }
      }
    } else {
      if (currentIndex >= 0) {
        items[currentIndex].classList.remove("is-active");
        currentIndex--;
        if (currentIndex < 0) {
          currentIndex = 0;
          direction = 1;
        }
      }
    }
  }

  function startLoop() {
    clearInterval(intervalId);
    
    // Fade out container
    gsap.to(container, {
      opacity: 0,
      duration: 0.1,
      ease: "power2.out",
      onComplete: () => {
        // Reset values
        parentRotation = 0;
        currentIndex = 0;
        direction = 1;

        // Reset items
        items.forEach((item, i) => {
          item.classList.remove("is-active");
          item.style.transform = `rotate(${i * tilt}deg) translateY(${i * offset}px)`;
        });

        // Reset container rotation
        gsap.set(container, { rotation: 0 });

        // Fade in container
        gsap.to(container, {
          opacity: 1,
          duration: 0.1,
          ease: "power2.in",
          onComplete: () => {
            // Start the interval after fade in
            intervalId = setInterval(cycle, 2000);
          }
        });
      }
    });
  }

  // Start initial loop
  startLoop();

  // Restart on click (only if body does not have "intro")
  document.querySelectorAll('[data-class="intro"]').forEach(el => {
    el.addEventListener("click", () => {
      if (!document.body.classList.contains("intro")) {
        startLoop();
      }
    });
  });
});
  
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll("[data-nav-link]");
  const filter = document.querySelector(".svg-filter feDisplacementMap"); // target filter element

  // Reusable animation function
  function animateScale(from, to, duration) {
    gsap.fromTo(
      filter, 
      { attr: { scale: from } }, 
      { attr: { scale: to }, duration: duration / 1000, ease: "power2.inOut" }
    );
  }

  // Core animation logic
  function handleNavigation(link) {
    if (link.classList.contains("is-active")) return;

    const newClass = link.getAttribute("data-class");
    if (!newClass) return;

    // Add scale-down
    document.body.classList.add("scale-down");
    animateScale(0, 80, 400); // animate up

    setTimeout(() => {
      document.body.className = "";
      document.body.classList.add(newClass, "scale-down");
    }, 600);

    setTimeout(() => {
      document.body.classList.remove("scale-down");
      animateScale(80, 0, 400); // animate back
    }, 1200);

    navLinks.forEach(l => l.classList.remove("is-active"));
    link.classList.add("is-active");
  }

  navLinks.forEach(link => {
    // Mouse click
    link.addEventListener("click", () => handleNavigation(link));

    // Keyboard (Enter or Space)
    link.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // prevent scrolling on Space
        handleNavigation(link);
      }
    });

    // Make sure links are focusable
    link.setAttribute("tabindex", "0");
    link.setAttribute("role", "button");
  });
});

document.addEventListener('DOMContentLoaded', function () {

    gsap.registerPlugin(Flip);
    gsap.registerPlugin(ScrollTrigger);
    gsap.registerPlugin(SplitText);
    gsap.registerPlugin(CustomEase);

    
const bg = document.querySelector('[data-nav-link-bg]');
const links = document.querySelectorAll('[data-nav-link]');

function getActiveLink() {
    return document.querySelector('[data-nav-link].is-active');
}

function moveBgTo(target) {
    if (!target || !bg) return;

    const state = Flip.getState(bg);

    target.appendChild(bg);

    Flip.from(state, {
        duration: 0.4,
        ease: "power2.out"
    });
}

links.forEach(link => {
    link.addEventListener('mouseenter', () => moveBgTo(link));
    link.addEventListener('mouseleave', () => moveBgTo(getActiveLink()));
});

// Initial position on load
const initialActive = getActiveLink();
if (initialActive) moveBgTo(initialActive);


    $('.nav_menu_btn').on('click', function () {
        $('.nav_component').toggleClass('is-open');
    });

    const testimonials = new Swiper('.swiper.is-testimonial', {
        // Optional parameters

        spaceBetween: 32,
        speed: 800,
        navigation: {
            nextEl: '[data-swiper-button="next"]',
            prevEl: '[data-swiper-button="previous"]',
        },
    });

    // Create custom ease
    CustomEase.create('customCurve', 'M0,0 C0.625,0.05,0,1,1,1');

    gsap.defaults({
        ease: 'customCurve',
        duration: 0.7,
    });

    // Stagger button
    function initButtonCharacterStagger() {
        const offsetIncrement = 0.01; // Transition offset increment in seconds
        const buttons = document.querySelectorAll('[data-link-animate-chars]');

        buttons.forEach((button) => {
            const text = button.textContent; // Get the button's text content
            button.innerHTML = ''; // Clear the original content

            [...text].forEach((char, index) => {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.transitionDelay = `${index * offsetIncrement}s`;

                // Handle spaces explicitly
                if (char === ' ') {
                    span.style.whiteSpace = 'pre'; // Preserve space width
                }

                button.appendChild(span);
            });
        });
    }

    initButtonCharacterStagger();

    // Wait for all fonts to be loaded before splitting text and animating
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(runTextAnimations);
    } else {
        // Fallback if Font Loading API is not supported
        runTextAnimations();
    }

    function runTextAnimations() {
        // Animate characters with SplitText (split into lines, words, and chars, but animate only chars)
        document.querySelectorAll('[data-animate-chars]').forEach(element => {
            // SplitText splits the element into lines, words, and chars
            const split = new SplitText(element, { type: 'lines,words,chars' });
            // Get animation-delay attribute or default to 0
            const delay = parseFloat(element.getAttribute('animation-delay')) || 0;

            gsap.fromTo(
                split.chars,
                { opacity: 0, y },
                {
                    opacity: 1,
                    filter: 'blur(0px)',
                    stagger: 0.01,
                    delay: delay,
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 80%',
                        end: 'bottom 20%',
                    },
                }
            );
        });

        // Animate words with SplitText
        document.querySelectorAll('[data-animate-words]').forEach(element => {
            // SplitText splits the element into words
            const split = new SplitText(element, { type: 'words' });
            // Get animation-delay attribute or default to 0
            const delay = parseFloat(element.getAttribute('animation-delay')) || 0;

            gsap.fromTo(
                split.words,
                { opacity: 0, filter: 'blur(8px)' },
                {
                    opacity: 1,
                    filter: 'blur(0px)',
                    stagger: 0.05,
                    delay: delay,
                    markers: true,
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 80%',
                        end: 'bottom 20%',
                    },
                }
            );
            // After splitting into words
            split.words.forEach(word => word.classList.add('split-word'));
        });

        // Animate direct children for data-animate-children
        document.querySelectorAll('[data-animate-children]').forEach(element => {
            const children = Array.from(element.children);
            const delay = parseFloat(element.getAttribute('animation-delay')) || 0;

            gsap.fromTo(
                children,
                { opacity: 0, y: 40, filter: 'blur(8px)' },
                {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    stagger: 0.1,
                    delay: delay,
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 80%',
                        end: 'bottom 20%',
                    },
                }
            );
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {

    function initSlideDelays() {
        document.querySelectorAll('[data-slide]').forEach((slide) => {
            let delay = 0; // Départ à 0s pour [data-slide-delay]

            // Appliquer un délai croissant de 0.08s pour les enfants avec [data-slide-delay]
            slide.querySelectorAll('[data-slide-delay]').forEach((element) => {
                element.style.transitionDelay = `${delay}s`;
                delay += 0.08;
            });

            // Appliquer un délai croissant de 0.04s pour les enfants avec [data-slide-delay-fast]
            slide.querySelectorAll('[data-slide-delay-fast]').forEach((element) => {
                element.style.transitionDelay = `${delay}s`;
                delay += 0.04;
            });
        });
    }

    initSlideDelays();

    let swiperPortfolio = null;
    let swiperPortfolioItemList = null;
    let lastScreenWidth = window.innerWidth;
    let isAnimating = false;
    function initializeSwipers() {
        const screenWidth = window.innerWidth;
        if (swiperPortfolio) swiperPortfolio.destroy(true, true);
        if (swiperPortfolioItemList) swiperPortfolioItemList.destroy(true, true);
        if (screenWidth > 991) {
            swiperPortfolio = new Swiper('.swiper.is-work-img', {
                slidesPerView: 1,
                spaceBetween: 4,
                loop: false,
                centeredSlides: true,
                effect: 'fade',
                fadeEffect: {
                    crossFade: true,
                },
                speed: 800,
                navigation: {
                    nextEl: '[data-swiper-button="next"]',
                    prevEl: '[data-swiper-button="previous"]',
                },
            });
        } else {
            swiperPortfolio = new Swiper('.swiper.is-work-img', {
                slidesPerView: 1,
                spaceBetween: 12,
                loop: false,
                centeredSlides: true,
                effect: 'fade',
                fadeEffect: {
                    crossFade: true,
                },
                speed: 800,
                navigation: {
                    nextEl: '[data-swiper-button="next"]',
                    prevEl: '[data-swiper-button="previous"]',
                },
                breakpoints: {
                    320: {
                        slidesPerView: 1.05,
                        spaceBetween: 0,
                    },
                    480: {
                        slidesPerView: 1.2,
                        spaceBetween: 0,
                    },
                    768: {
                        slidesPerView: 1.5,
                        spaceBetween: 0,
                    },
                },
            });
        }
        if (screenWidth > 991) {
            swiperPortfolioItemList = new Swiper('.swiper.is-work-txt', {
                slidesPerView: 1,
                spaceBetween: 4,
                loop: false,
                effect: 'fade',
                speed: 0,
                allowTouchMove: false,
                fadeEffect: {
                    crossFade: true,
                },
            });
        } else {
            swiperPortfolioItemList = new Swiper('.swiper.is-work-txt', {
                slidesPerView: "1",
                spaceBetween: 12,
                loop: false,
                effect: 'fade',
                fadeEffect: {
                    crossFade: true,
                },
                speed: 0,
                allowTouchMove: false,
                breakpoints: {
                    320: {
                        slidesPerView: 1.05,
                        spaceBetween: 0,
                    },
                    480: {
                        slidesPerView: 1.2,
                        spaceBetween: 0,
                    },
                    768: {
                        slidesPerView: 1.5,
                        spaceBetween: 0,
                    },
                },
            });
        }
        swiperPortfolio.on('slideChange', () => {
            if (isAnimating) return;
            isAnimating = true;
            const activeIndex = swiperPortfolio.activeIndex;
            const currentSlide = swiperPortfolioItemList.slides[swiperPortfolioItemList.activeIndex];
            if (currentSlide) {
                currentSlide.classList.add('swiper-slide-wait');
            }
            document.querySelector('[data-swiper-button="next"]').disabled = true;
            document.querySelector('[data-swiper-button="previous"]').disabled = true;
            setTimeout(() => {
                if (currentSlide) {
                    currentSlide.classList.remove('swiper-slide-wait');
                }
                swiperPortfolioItemList.slideTo(activeIndex, 0);
                document.querySelector('[data-swiper-button="next"]').disabled = false;
                document.querySelector('[data-swiper-button="previous"]').disabled = false;
                isAnimating = false;
            }, 550);
        });
        swiperPortfolioItemList.on('slideChange', () => {
            if (isAnimating) return;
            const activeIndex = swiperPortfolioItemList.activeIndex;
            swiperPortfolio.slideTo(activeIndex, 0);
        });
    }
    initializeSwipers();
    window.addEventListener('resize', () => {
        const newScreenWidth = window.innerWidth;
        if (newScreenWidth !== lastScreenWidth) {
            lastScreenWidth = newScreenWidth;
            initializeSwipers();
        }
    });
});

