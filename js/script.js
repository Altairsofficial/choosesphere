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

window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});