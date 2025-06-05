const storyContent = {
  enter: {
    title: "Dentro del Faro",
    text: "Entras al faro. La escalera cruje bajo tus pies. Arriba, encuentras un diario antiguo. ¿Lo lees o sigues subiendo?",
    image: "https://images.unsplash.com/photo-1519750783829-7e84c3773d79",
    choices: [
      { text: "Leer el diario", next: "diary" },
      { text: "Subir al tejado", next: "roof" }
    ]
  },
  cave: {
    title: "La Cueva",
    text: "Encuentras una cueva oscura. Dentro, hay un cofre cerrado. ¿Intentas abrirlo o sales?",
    image: "https://images.unsplash.com/photo-1519750783829-7e84c3773d79",
    choices: [
      { text: "Abrir el cofre", next: "treasure" },
      { text: "Salir de la cueva", next: "escape" }
    ]
  },
  boat: {
    title: "El Bote",
    text: "Regresas al bote, pero una tormenta se acerca. ¿Navegas o te quedas en la playa?",
    image: "https://images.unsplash.com/photo-1519750783829-7e84c3773d79",
    choices: [
      { text: "Navegar", next: "storm" },
      { text: "Quedarte", next: "survive" }
    ]
  }
};

function showScene(sceneId) {
  const storyDiv = document.getElementById("story");
  const scene = storyContent[sceneId];
  if (scene) {
    storyDiv.innerHTML = `
      <h2>${scene.title}</h2>
      <p>${scene.text}</p>
      <img src="${scene.image}" alt="${scene.title}">
      <div class="choices">
        ${scene.choices.map(choice => `<button onclick="showScene('${choice.next}')">${choice.text}</button>`).join("")}
      </div>
    `;
  }
}

function playVideo(url) {
  const videoDiv = document.getElementById("video-story");
  videoDiv.innerHTML = `
    <h2>Escena siguiente</h2>
    <iframe width="560" height="315" src="${url}" frameborder="0" allowfullscreen></iframe>
    <p>La historia continúa... (Fin de la demo)</p>
  `;
}

document.addEventListener('DOMContentLoaded', function () {
  console.log('Swiper script loaded');
  
  // Inicializar Swiper
  const swiper = new Swiper('.swiper', {
    slidesPerView: 3,
    spaceBetween: 20,
    loop: false,
    effect: 'slide',
    speed: 600,
    cssMode: false,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
      bulletClass: 'swiper-pagination-bullet',
      bulletActiveClass: 'swiper-pagination-bullet-active',
    },
    autoplay: {
      delay: 5000,
      disableOnInteraction: true,
    },
    touchRatio: 1.5,
    simulateTouch: true,
    grabCursor: true,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 15,
      },
      640: {
        slidesPerView: 2,
        spaceBetween: 15,
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 20,
      },
    },
    on: {
      init: function () {
        console.log('Swiper initialized');
      },
      slideChange: function () {
        console.log('Slide changed to: ', this.activeIndex);
      },
    },
  });

  // Verificar elementos de navegación
  if (!document.querySelector('.swiper-button-next') || !document.querySelector('.swiper-button-prev')) {
    console.warn('Navigation buttons not found');
  }

  // Modal functionality
  const modal = document.getElementById('story-modal');
  const modalImage = modal.querySelector('.modal-image');
  const modalTitle = modal.querySelector('.modal-title');
  const modalDescription = modal.querySelector('.modal-description');
  const modalStart = modal.querySelector('.modal-start');
  const modalClose = modal.querySelector('.modal-close');

  // Abrir modal al clicar en tarjeta
  document.querySelectorAll('.content-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-url');
      const image = item.getAttribute('data-image');
      const title = item.getAttribute('data-title');
      const description = item.getAttribute('data-description');

      modalImage.src = image;
      modalImage.alt = title;
      modalTitle.textContent = title;
      modalDescription.textContent = description;
      modalStart.href = url;

      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Evitar scroll
    });
  });

  // Cerrar modal al clicar en "X" o fondo
  modalClose.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Cerrar modal con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});

// Navbar scroll
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// FAQ Toggle
document.querySelectorAll('.faq-item').forEach(item => {
  item.addEventListener('click', () => {
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('active');
      i.querySelector('p').style.display = 'none';
    });
    if (!isActive) {
      item.classList.add('active');
      item.querySelector('p').style.display = 'block';
    }
  });
});