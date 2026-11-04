let koszyk = []; 
let wszystkieKrzesla = []; 

// 1. Pobieranie danych z serwera
async function ladujMiejsca() {
    try {
        const odpowiedz = await fetch('/api/TicketBooth/seats');
        wszystkieKrzesla = await odpowiedz.json();
        odswiezWidok();
    } catch (błąd) {
        console.error("Błąd połączenia z bazą:", błąd);
    }
}

// 2. Rysowanie sali
function odswiezWidok() {
    const mapa = document.getElementById('seat-map');
    if (!mapa) return; 
    mapa.innerHTML = ''; 

    wszystkieKrzesla.forEach(krzeslo => {
        const kwadracik = document.createElement('div');
        kwadracik.classList.add('seat');
        kwadracik.textContent = krzeslo.number; 
        kwadracik.title = `Rząd: ${krzeslo.row}, Miejsce: ${krzeslo.number}`; 
        
        const kolumnaSiatki = krzeslo.number <= 15 ? krzeslo.number : krzeslo.number + 1;
        const rzadSiatki = krzeslo.row <= 6 ? krzeslo.row : krzeslo.row + 1;
        kwadracik.style.gridColumn = kolumnaSiatki;
        kwadracik.style.gridRow = rzadSiatki;

        if (krzeslo.status !== "Wolne") {
            kwadracik.classList.add('zajete');
        } else {
            if (koszyk.includes(krzeslo.id)) {
                kwadracik.classList.add('wybrane');
            } else {
                kwadracik.classList.add('wolne');
            }
            kwadracik.onclick = () => przelaczMiejsce(krzeslo.id);
        }
        
        mapa.appendChild(kwadracik);
    });
    
    odswiezKoszyk(); 
}

// 3. Logika koszyka
function przelaczMiejsce(id) {
    if (koszyk.includes(id)) {
        koszyk = koszyk.filter(k => k !== id); 
    } else {
        koszyk.push(id); 
    }
    odswiezWidok(); 
}

function odswiezKoszyk() {
    const listaDiv = document.getElementById('koszyk-lista');
    const btnKup = document.getElementById('btn-kup');
    if (!listaDiv || !btnKup) return;

    if (koszyk.length === 0) {
        listaDiv.innerHTML = "Brak wybranych miejsc.";
        btnKup.disabled = true;
    } else {
        const wybraneDetale = koszyk.map(id => wszystkieKrzesla.find(k => k.id === id));
        let tekst = wybraneDetale.map(k => `Rząd ${k.row}, Miejsce ${k.number}`).join('<br>');
        listaDiv.innerHTML = `Liczba biletów: ${koszyk.length}<br><br>${tekst}`;
        btnKup.disabled = false;
    }
}

// 4. Otwieranie i zamykanie okienka z danymi (Modal)
function kupBilety() {
    const modal = document.getElementById('modal-rezerwacji');
    if (modal) modal.style.display = "block";
}

function zamknijModal() {
    const modal = document.getElementById('modal-rezerwacji');
    if (modal) modal.style.display = "none";
}

// 5. Wysyłanie rezerwacji z danymi klienta do bazy
// 5. Wysyłanie rezerwacji z danymi klienta do bazy i WALIDACJĄ
async function potwierdzRezerwacje() {
    const elImie = document.getElementById('klient-imie');
    const elEmail = document.getElementById('klient-email');
    const elTelefon = document.getElementById('klient-telefon');
    
    // Pobieramy wartości i usuwamy puste spacje na początku i końcu (.trim())
    const imie = elImie ? elImie.value.trim() : '';
    const email = elEmail ? elEmail.value.trim() : '';
    const telefon = elTelefon ? elTelefon.value.trim() : '';

    // --- ETAP 1: Czy pola nie są puste? ---
    if (!imie || !email || !telefon) {
        alert("Proszę wypełnić wszystkie pola (Imię, E-mail oraz Telefon)!");
        return;
    }

    // --- ETAP 2: Walidacja E-mail ---
    // Sprawdza czy jest coś przed @, potem @, potem coś, kropka i znowu coś
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Proszę podać poprawny adres e-mail (np. jan@kowalski.pl).");
        return;
    }

    // --- ETAP 3: Walidacja Telefonu ---
    // Usuwamy wszystko co nie jest cyfrą i sprawdzamy czy zostało min. 9 cyfr
    const sameCyfry = telefon.replace(/[^0-9]/g, '');
    if (sameCyfry.length < 9) {
        alert("Proszę podać poprawny numer telefonu (minimum 9 cyfr).");
        return;
    }

    // Jeśli przeszliśmy walidację, blokujemy przycisk i wysyłamy dane
    const btnPotwierdz = document.querySelector('.modal-content button.kup');
    if (btnPotwierdz) {
        btnPotwierdz.disabled = true;
        btnPotwierdz.textContent = "Przetwarzanie...";
    }

    // Generujemy losowy numer zamówienia, np. SYGNAL-48291
    const numerZamowienia = "SYGNAL-" + Math.floor(10000 + Math.random() * 90000);

    const daneKlienta = {
        ClientName: imie,
        ClientEmail: email,
        ClientPhone: telefon,
        OrderNumber: numerZamowienia
    };
    

    const zapytania = koszyk.map(id => 
        fetch(`/api/TicketBooth/reserve/${id}`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(daneKlienta)
        })
    );
    
    await Promise.all(zapytania);
    
    zamknijModal();
    alert(`Dziękujemy, ${imie}! Twoje bilety zostały zarezerwowane. Szczegóły prześlemy na adres: ${email}`);
    
    koszyk = [];
    if (elImie) elImie.value = '';
    if (elEmail) elEmail.value = '';
    if (elTelefon) elTelefon.value = '';
    
    if (btnPotwierdz) {
        btnPotwierdz.disabled = false;
        btnPotwierdz.textContent = "Potwierdzam i rezerwuję";
    }
    
    ladujMiejsca(); 
}

// Start
ladujMiejsca();