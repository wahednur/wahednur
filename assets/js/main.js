/* Desktop search expension function start */
const searchIcon = document.querySelector('.search-group__icon');
const searchHover = document.querySelector('.input-control');

searchIcon.addEventListener('mouseover', () => {
    searchHover.style.width = '100%';
    
});
searchIcon.addEventListener('mouseout', () => {
    searchHover.style.width = '';
    
});
/* Desktop search expension function end */

/* Desktop menu ative function start */
const menuBtn = document.querySelectorAll('.menu-search .desk-nav__link');
const active = document.querySelectorAll('.desk-nav__menu-item');
menuBtn.forEach((item, indx) => {
    item.addEventListener('click', () => {
        menuAction()
        active[indx].classList.add('active')
    })
})
function menuAction(){
    active.forEach(item => item.classList.remove('active'));
    
};

/* Desktop menu ative function esnd */

/* Mobile active menu function start  */
const mobileMenuBtn = document.querySelectorAll('.menu-search .mobile-nav__link');
const mobileMenuItem = document.querySelectorAll('.menu-search .mobile-nav__item');

mobileMenuBtn.forEach((item, indx) => {
    item.addEventListener('click', () => {
        removeActive()
        mobileMenuItem[indx].classList.add('active')
        showMenu.classList.remove('active');
    })
})
function removeActive(){
    mobileMenuItem.forEach(item => item.classList.remove('active'));
    showMenu.classList.remove('active');
}
/* Mobile active menu function end  */

const showMenuBtn = document.getElementById('showMenu');
const showMenu = document.querySelector('.mobile-menu');
showMenuBtn.addEventListener('click', () => {
    showMenu.classList.toggle('active');
   if(showMenu.hasClass('active')){
       showMenu.classList.remove('active')
   }
    
})



