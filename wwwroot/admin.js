let doZablokowania = [];
let doZwolnienia = [];
let wszystkieKrzesla = [];

async function ladujMiejsca() {
    const odpowiedz = await fetch('/api/TicketBooth/seats');
    wszystkieKrzesla = await odpowiedz.json();
    odswiezWidok();
}

function odswiezWidok() {
    const mapa = document.getElementById('seat-map');
    mapa.innerHTML = ''; 

    wszystkieKrzesla.forEach(krzeslo => {
        const kwadracik = document.createElement('div');
        kwadracik.classList.add('seat');
        kwadracik.textContent = krzeslo.number; 
        
        const kolumnaSiatki = krzeslo.number <= 15 ? krzeslo.number : krzeslo.number + 1;
        const rzadSiatki = krzeslo.row <= 6 ? krzeslo.row : krzeslo.row + 1;
        kwadracik.style.gridColumn = kolumnaSiatki;
        kwadracik.style.gridRow = rzadSiatki;

        // Logika wyświetlania w trybie Admina
        if (krzeslo.status !== "Wolne") {
            if (doZwolnienia.includes(krzeslo.id)) {
                kwadracik.classList.add('admin-do-zwolnienia');
                kwadracik.title = "Oznaczone do ZWOLNIENIA";
            } else {
                kwadracik.classList.add('admin-zajete');
                kwadracik.title = "Zajęte - kliknij, by zwolnić";
            }
        } else {
            if (doZablokowania.includes(krzeslo.id)) {
                kwadracik.classList.add('admin-do-zablokowania');
                kwadracik.title = "Oznaczone do ZABLOKOWANIA";
            } else {
                kwadracik.classList.add('wolne');
                kwadracik.title = "Wolne - kliknij, by zablokować";
            }
        }
        
        kwadracik.onclick = () => przelaczMiejsce(krzeslo);
        mapa.appendChild(kwadracik);
    });
    
    odswiezPanel();
}

function przelaczMiejsce(krzeslo) {
    if (krzeslo.status !== "Wolne") {
        // Jeśli zajęte, dodajemy/usuwamy z listy do zwolnienia
        if (doZwolnienia.includes(krzeslo.id)) {
            doZwolnienia = doZwolnienia.filter(id => id !== krzeslo.id);
        } else {
            doZwolnienia.push(krzeslo.id);
        }
    } else {
        // Jeśli wolne, dodajemy/usuwamy z listy do zablokowania
        if (doZablokowania.includes(krzeslo.id)) {
            doZablokowania = doZablokowania.filter(id => id !== krzeslo.id);
        } else {
            doZablokowania.push(krzeslo.id);
        }
    }
    odswiezWidok();
}

function odswiezPanel() {
    const listaDiv = document.getElementById('admin-lista');
    const btnWykonaj = document.getElementById('btn-wykonaj');

    if (doZablokowania.length === 0 && doZwolnienia.length === 0) {
        listaDiv.innerHTML = "Brak zaznaczonych zmian.";
        btnWykonaj.disabled = true;
    } else {
        let tekst = "";
        
        if (doZablokowania.length > 0) {
            tekst += `<span style="color: #FF9800;">Do zablokowania (${doZablokowania.length}):</span> `;
            tekst += doZablokowania.map(id => {
                const k = wszystkieKrzesla.find(x => x.id === id);
                return `R${k.row}M${k.number}`;
            }).join(', ') + "<br><br>";
        }

        if (doZwolnienia.length > 0) {
            tekst += `<span style="color: #2196F3;">Do zwolnienia (${doZwolnienia.length}):</span> `;
            tekst += doZwolnienia.map(id => {
                const k = wszystkieKrzesla.find(x => x.id === id);
                return `R${k.row}M${k.number}`;
            }).join(', ');
        }

        listaDiv.innerHTML = tekst;
        btnWykonaj.disabled = false;
    }
}

async function wykonajZmiany() {
    if (!confirm(`Czy na pewno chcesz zatwierdzić te zmiany?\n\nBlokowane: ${doZablokowania.length}\nZwalniane: ${doZwolnienia.length}`)) {
        return;
    }

    const btnWykonaj = document.getElementById('btn-wykonaj');
    btnWykonaj.disabled = true;
    btnWykonaj.textContent = "Przetwarzanie...";

    // Generujemy wszystkie zapytania jednocześnie (blokowanie i zwalnianie)
    const zapytaniaBlokady = doZablokowania.map(id => fetch(`/api/TicketBooth/reserve/${id}`, { method: 'PUT' }));
    const zapytaniaZwolnienia = doZwolnienia.map(id => fetch(`/api/TicketBooth/cancel/${id}`, { method: 'PUT' }));
    
    // Czekamy na wykonanie wszystkich
    await Promise.all([...zapytaniaBlokady, ...zapytaniaZwolnienia]);
    
    alert("Zmiany zostały pomyślnie wprowadzone do bazy!");
    
    // Czyszczenie list po sukcesie
    doZablokowania = [];
    doZwolnienia = [];
    btnWykonaj.textContent = "Zatwierdź zmiany";
    
    ladujMiejsca(); 
}

ladujMiejsca();