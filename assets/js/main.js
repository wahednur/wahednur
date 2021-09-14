/* Desktop search bar on clik active javascript start */
const searchBtn = document.querySelector('.search-btn');
const searchHover = document.querySelector('.input-control');

searchBtn.addEventListener('mouseover', () => {
    searchHover.style.width = '100%';
});

searchBtn.addEventListener('mouseout', () => {
    searchHover.style.width = '';
});
/* Desktop search bar on clik active javascript end */
/* Desktop Menu on clik active javascript start */
const deskMnuBtn = document.querySelectorAll('.desktop-nav .nav-search .desk-nav__link')
const deskNavActive = document.querySelectorAll('.desk-nav__link')
deskMnuBtn.forEach((item, indx) => {
    item.addEventListener('click', () =>{
        removeActive();
        deskNavActive[indx].classList.add('active');
    })
})

function removeActive(){
    deskNavActive.forEach(item => item.classList.remove('active'));
}
/* Desktop Menu on clik active javascript end */

/* Mobile menu on clik active javascript start */
const mblNavBtn = document.querySelectorAll('.mobile-nav nav .mbl-nav__mbl-link')
const mblNavActive = document.querySelectorAll('.mbl-nav__mbl-link')
mblNavBtn.forEach((item, indx) =>{
    item.addEventListener('click', () => {
        removeBmlNavActive();
        mblNavActive[indx].classList.add('active');
    });
});
function removeBmlNavActive(){
    mblNavActive.forEach(item => item.classList.remove('active'))
}
/* Mobile menu on clik active javascript end */