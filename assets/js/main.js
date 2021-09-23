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
       
        mblSubActive.classList.remove('active');
        
    });
});
function removeBmlNavActive(){
    mblNavActive.forEach(item => item.classList.remove('active'));
    
    mblSubActive.classList.remove('active');
    mblSearch.classList.remove('active');
    
}
/* Mobile menu on clik active javascript end */

/** Mobile sub menu active javascript start */
const mblSubBtn = document.querySelector('.sub-mbtn');
const mblSubActive = document.querySelector('.mbl-submenu');

mblSubBtn.addEventListener('click', () => {
    mblSubActive.classList.toggle('active');
    mblSearch.classList.remove('active');
    
})




/** Mobile sub menu active javascript end */


const mblSearchBtn = document.querySelector('.mobile-search');
const mblSearch = document.querySelector('.mbl-search');
mblSearchBtn.addEventListener('click', () => {
    mblSearch.classList.toggle('active');
})


const msgBtn = document.querySelector('.msg-box');
const closeBtn = document.querySelector('.close-btn');
const activeMsgBox = document.querySelector('.popup-msg-box');
msgBtn.addEventListener('click', () => {
    activeMsgBox.classList.toggle('active');
})
closeBtn.addEventListener('click', () => {
    activeMsgBox.classList.remove('active');
})


/*Portfolio tab start */
const tabBtn = document.querySelectorAll('.tab-btn-container .tab-btn');
const tabContainer = document.querySelectorAll('.portfolio-container .tab-wrap .tab-container');
tabBtn.forEach((item, indx) => {
    item.addEventListener('click', () =>{
        removeTabActive();
        tabContainer[indx].classList.add('active');
        tabBtn[indx].classList.add('active');
    })
})

function removeTabActive(){
    tabContainer.forEach(item => item.classList.remove('active'));
    tabBtn.forEach(item => item.classList.remove('active'));
}


// Shop Slider 
const slPrevtBtn = document.querySelector('.prev');
const slNextBtn = document.querySelector('.next');
const images = document.querySelectorAll('.ga-img');
const feImg = document.querySelector('.fe-img')

let slide = 0;

slNextBtn.addEventListener('click', () => {
    slide++
    if(slide>images.length -1){
        slide = 0
    }
    feImg.src = images[slide].src;
    

    
  
})

slPrevtBtn.addEventListener('click', () => {
    slide--
    if(slide < 0){
        slide = images.length -1
    }
    feImg.src = images[slide].src;
    
})


window.addEventListener('scroll', () => {
    const deskNav = document.querySelector('.desktop-nav');
    deskNav.classList.toggle('sticky', window.scrollY > 500);
})
