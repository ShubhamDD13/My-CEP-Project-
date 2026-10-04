// ===============================
// MOBILE NAVIGATION
// ===============================

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");

menuButton.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});


// Close mobile menu when a link is clicked

const navigationLinks = document.querySelectorAll(".nav-links a");

navigationLinks.forEach((link) => {

    link.addEventListener("click", () => {
        navLinks.classList.remove("active");
    });

});
