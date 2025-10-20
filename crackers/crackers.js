// background-effect toggle

const btn = document.getElementById("startBtn");
let celebrating = false; // track toggle state

btn.addEventListener("click", () => {
    celebrating = !celebrating;

    if (celebrating) {
        document.body.classList.add("animate-bg");
        btn.textContent = "Lights Off 🎇";
    } else {
        document.body.classList.remove("animate-bg");
        btn.textContent = "Lights On 🎆";
    }
});

// card-effect on clicking

const cards = document.querySelectorAll('.card');

cards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove 'active' from all other cards
        cards.forEach(c => {
            if (c !== card) c.classList.remove('active');
        });

        // Toggle the clicked card
        card.classList.toggle('active');
    });
});

