window.addEventListener('DOMContentLoaded', () => {
    // Load Views
    // load default view
    loadHome();


    // Variable Declaration
    const typingArea = document.querySelector('#typing-area'),
          wpmText = document.querySelector('#wpm-text');


    var dropDownBtns = document.querySelectorAll('.dropdown-trigger');
    var dropDownInstances = M.Dropdown.init(dropDownBtns, {});


    // // Event Listeners
    // document.addEventListener('keydown', doAddEventListener);

    // //Typing init on load
    // doInitTyping(data);

    initGuestMode();
});

const app = document.querySelector('#app'),
      navRoomBtn = document.querySelector('#navRoomBtn'),
      navStatsBtn = document.querySelector('#navStatsBtn'),
      navLoginBtn = document.querySelector('#navLoginBtn'),
      navSignUpBtn = document.querySelector('#navSignUpBtn'),
      navLogoutBtn = document.querySelector('#navLogoutBtn'),
      homeBtns = document.querySelectorAll('.homeBtns'),
      accountDropdownBtn = document.querySelector('#accountDropdownBtn'),
      db = firebase.firestore(),
      provider = new firebase.auth.GoogleAuthProvider();
      auth = firebase.auth();

let refreshIntervalId = "",
    nhour = "",
    nmin = "",
    nsec = "",
    secondsElapsed = 0,
    isPaused = false,
    STARTED = false;


// Event Listeners
homeBtns.forEach(e => e.addEventListener('click', loadHome));
navRoomBtn.addEventListener('click', loadRooms);
// navStatsBtn.addEventListener('keydown', doAddEventListener);
navLoginBtn.addEventListener('click', doLogin);
navLogoutBtn.addEventListener('click', doLogout);
// navSignUpBtn.addEventListener('click', loadRooms);

auth.onAuthStateChanged((user) => {
    if (user){
        accountDropdownBtn.innerHTML = `
            <img src="${user.photoURL}" alt="" class="profile-picture circle">
            <i class="material-icons right">
        `;
    } else {
        accountDropdownBtn.innerHTML = `
            Guest <i class="material-icons right">
        `;
    }
});

function generateGuestID() {
    return 'guest-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*12|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(12);
    });
}

function doLogout(){
    auth.signOut();
}
    
function doLogin(){
    auth.signInWithPopup(provider);   
}


function initGuestMode(){
    let guestID = localStorage.guestID;

    if (!guestID){
        let newGuestID = generateGuestID();

        localStorage.setItem("guestID", newGuestID);
    } else {
        console.log("Existing user", guestID);
    }
}

function loadHome(){
    app.innerHTML = `
        <div id="" class="center-align">
            <h1 id="wpm-text">Score</h1>
            <p>How many words per minute can you type?</p>
            <div class="card small flow-text hoverable" id="typing-area"></div>
            <p id="ahtText">Start typing to begin...</p>
        </div>
    `;

    // Event Listeners
    document.addEventListener('keydown', doAddEventListener);

    //Typing init on load
    doInitTyping(data);
}

function loadRooms(){
    // firestore
    // db
    let roomsRef;
    let unsubscribe;
    let listArray = [];
    let refreshIntervalID = localStorage.refreshIntervalID || 0;


    // Remove typing interval when 
    if (refreshIntervalID){
        console.log(refreshIntervalID)
        clearInterval(refreshIntervalID)
    }

    // init load view
    app.classList.add('row');

    roomsRef = db.collection("rooms");

    roomsRef
        // .get().then(function(querySnapshot) {
        .onSnapshot(function(querySnapshot) {
            // Clear listArray everychange
            listArray = [];
            querySnapshot.forEach(function(doc) {
                // doc.data() is never undefined for query doc snapshots
                console.log(doc.data());
                const roomID = doc.id;
                


                listArray.push(`
                    <div class="col s12 m4">
                    <div class="card" data-roomid=${roomID}>
                        <div class="card-content" style="min-height: 350px;">
                        <div class="card-title" style="display: flex; justify-content: space-between;">
                            <span class="card-title">${doc.data().name}</span>
                            <span style="font-size: 16px;">Status: ${doc.data().status}</span>
                        </div>
                        <ul class="collection" id=list_${roomID}>
                            ${doc.data().lobby_list.map(l => `<li class="collection-item">${l}</li>`).join('')}
                        </ul>
                        
                        </div>
                        <div class="card-action">
                            <a href="#" style="width: 100%; margin: 2.5px 0px" class="btn joinRoom">Join Room</a>
                            <a href="#" style="width: 100%; margin: 2.5px 0px" class="btn blue startGame">Start Game</a>
                            <a href="#" style="width: 100%; margin: 2.5px 0px" class="btn grey resetRoom">Reset Room</a>
                        </div>
                    </div>
                    </div>
                `);
            });
            console.log({listArray})
            listArray.reverse();
            app.innerHTML = listArray.join('');

            auth.onAuthStateChanged((user) => {
                if (user){
                    roomsRef = db.collection("rooms");
                    let guestID = localStorage.guestID || generateGuestID();
                    let joinRoom = document.querySelectorAll('.joinRoom');
                    let startGame = document.querySelectorAll('.startGame');
                    let resetRoom = document.querySelectorAll('.resetRoom');
                    // Join Room Listener
                    joinRoom.forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            const ROOM_ID = btn.closest(".card").dataset.roomid;
                            console.log(e.target);
                            selectedRoomRef = roomsRef.doc(ROOM_ID);
                            selectedRoomRef.update({
                                lobby_list: firebase.firestore.FieldValue.arrayUnion(user.uid)
                            });
                            unsubscribe = selectedRoomRef
                            .onSnapshot(function(doc) {
                                console.log("Current data: ", doc.data());
                                // add/update user lobby list table
                                // using this data
                                const lobbyItems = doc.data().lobby_list.map(name => {
                                    return `<li class="collection-item">${ name }</li>`
                                });

                                document.querySelector(`#list_${ROOM_ID}`).innerHTML = lobbyItems.join('');
                            }); 
                        });
                    });

                    // Start Game Listener
                    startGame.forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            const roomCard = btn.closest(".card");
                            const ROOM_ID = roomCard.dataset.roomid;
                            const START_DATE = firebase.firestore.Timestamp.now();
                            const playersItemElement = roomCard.querySelectorAll(".collection-item");
                            const PLAYERS_LIST = Array.from(playersItemElement);
                            const roomData = {
                                room_ID: ROOM_ID,
                                start_date: START_DATE,
                                players: PLAYERS_LIST
                            };
                            console.log(e.target);
                            selectedRoomRef = roomsRef.doc(ROOM_ID);
                            selectedRoomRef.update({
                                status: "busy",
                                startDate: START_DATE
                            });

                            unsubscribe = selectedRoomRef
                            .onSnapshot(function(doc) {
                                let startTimeSeconds = doc.data().startTime.seconds;
                                let currentTimeSeconds = firebase.firestore.Timestamp.now().seconds;
                                let timeDifference = startTimeSeconds - currentTimeSeconds;
                                // let BASE_TIMER = (10 - timeDifference) * 1000;
                                let BASE_TIMER = (3 - timeDifference) * 1000;
                                // console.log("Current data: ", doc.data());
                                console.log("Current data: ", startTimeSeconds);
                                console.log("Now: " + currentTimeSeconds);
                                console.log("Difference: ", timeDifference);
                                let timerInterval
                                Swal.fire({
                                title: 'Get ready!',
                                html: 'Game will start in <b></b> milliseconds.',
                                timer: BASE_TIMER,
                                timerProgressBar: true,
                                allowOutsideClick: false,
                                willOpen: () => {
                                    //todo render typing game view
                                    doRenderNewGame(roomData);
                                    
                                    Swal.showLoading()
                                    timerInterval = setInterval(() => {
                                    const content = Swal.getContent()
                                    if (content) {
                                        const b = content.querySelector('b')
                                        if (b) {
                                        b.textContent = Swal.getTimerLeft()
                                        }
                                    }   
                                    }, 100)
                                },
                                onClose: () => {
                                    clearInterval(timerInterval)
                                }
                                }).then((result) => {
                                    /* Read more about handling dismissals below */
                                    if (result.dismiss === Swal.DismissReason.timer) {
                                        console.log('I was closed by the timer')
                                        // unsubscribe to firebase changes
                                        unsubscribe && unsubscribe();
                                    }
                                })
                            }); 
                        });
                    });

                    resetRoom.forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            const ROOM_ID = btn.closest(".card").dataset.roomid;
                            console.log(e.target);
                            selectedRoomRef = roomsRef.doc(ROOM_ID);
                            selectedRoomRef.update({
                                status: "open",
                                startTime: "",
                                lobby_list: []
                            });
                        });
                    });

                } else {
                    // accountDropdownBtn.innerHTML = `
                    //     ${localStorage.guestID || "Guest"} <i class="material-icons right">
                    // `;
                    roomsRef = db.collection("rooms");
                    let guestID = localStorage.guestID || generateGuestID();
                    let joinRoom = document.querySelectorAll('.joinRoom');
                    let startGame = document.querySelectorAll('.startGame');
                    let resetRoom = document.querySelectorAll('.resetRoom');
                    // Join Room Listener
                    joinRoom.forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            const ROOM_ID = btn.closest(".card").dataset.roomid;
                            console.log(e.target);
                            selectedRoomRef = roomsRef.doc(ROOM_ID);
                            selectedRoomRef.update({
                                lobby_list: firebase.firestore.FieldValue.arrayUnion(guestID)
                            });
                            // e.dataset.roomid
                            // add my userID/random generated name to 
                            // lobby_list array in rooms collection
                            // change to room lobby view 
                            unsubscribe = selectedRoomRef
                            .onSnapshot(function(doc) {
                                console.log("Current data: ", doc.data());
                                // add/update user lobby list table
                                // using this data
                                const lobbyItems = doc.data().lobby_list.map(name => {
                                    return `<li class="collection-item">${ name }</li>`
                                });

                                document.querySelector(`#list_${ROOM_ID}`).innerHTML = lobbyItems.join('');
                            }); 
                        });
                    });

                    // Start Game Listener
                    startGame.forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            const roomCard = btn.closest(".card");
                            const ROOM_ID = roomCard.dataset.roomid;
                            const START_DATE = firebase.firestore.Timestamp.now();
                            const playersItemElement = roomCard.querySelectorAll(".collection-item");
                            const PLAYERS_LIST = Array.from(playersItemElement).map(li => li.textContent);
                            const roomData = {
                                room_ID: ROOM_ID,
                                start_date: START_DATE,
                                players: PLAYERS_LIST
                            };
                            console.log(e.target);
                            selectedRoomRef = roomsRef.doc(ROOM_ID);
                            selectedRoomRef.update({
                                status: "busy",
                                startDate: START_DATE
                            });

                            unsubscribe = selectedRoomRef
                            .onSnapshot(function(doc) {
                                let startTimeSeconds = START_DATE.seconds;
                                let currentTimeSeconds = firebase.firestore.Timestamp.now().seconds;
                                let timeDifference = startTimeSeconds - currentTimeSeconds;
                                // let BASE_TIMER = (10 - timeDifference) * 1000;
                                let BASE_TIMER = (3 - timeDifference) * 1000;
                                // console.log("Current data: ", doc.data());
                                console.log("Current date: ", startTimeSeconds);
                                console.log("Now: " + currentTimeSeconds);
                                console.log("Difference: ", timeDifference);
                                let timerInterval
                                Swal.fire({
                                title: 'Get ready!',
                                html: 'Game will start in <b></b> milliseconds.',
                                timer: BASE_TIMER,
                                timerProgressBar: true,
                                allowOutsideClick: false,
                                willOpen: () => {
                                    //todo render typing game view
                                    doRenderNewGame(roomData);

                                    Swal.showLoading()
                                    timerInterval = setInterval(() => {
                                    const content = Swal.getContent()
                                    if (content) {
                                        const b = content.querySelector('b')
                                        if (b) {
                                        b.textContent = Swal.getTimerLeft()
                                        }
                                    }   
                                    }, 100)
                                },
                                onClose: () => {
                                    clearInterval(timerInterval)
                                }
                                }).then((result) => {
                                    /* Read more about handling dismissals below */
                                    if (result.dismiss === Swal.DismissReason.timer) {
                                        console.log('I was closed by the timer')
                                        // unsubscribe to firebase changes
                                        unsubscribe && unsubscribe();
                                    }
                                })
                            }); 
                        });
                    });

                    resetRoom.forEach((btn) => {
                        btn.addEventListener('click', (e) => {
                            const ROOM_ID = btn.closest(".card").dataset.roomid;
                            console.log(e.target);
                            selectedRoomRef = roomsRef.doc(ROOM_ID);
                            selectedRoomRef.update({
                                status: "open",
                                startTime: "",
                                lobby_list: []
                            });
                        });
                    });

                    // 
                }
            });
        });
    
    
}

function doRenderNewGame(data){
    // todo add new game collection in game document - done
    // add progress bar of players progress -> subscribe to changes -> rate limit
    // add typing game view
    
    console.log(data);
    let gamesRef;
    let gameID = `game_${generateCharactersID(20)}`;

    gamesRef = db.collection("games").doc(gameID);
    gamesRef.set({
        players: data.players,
        room_ID: data.room_ID,
        start_date: data.start_date
    })
    .then(function() {
        console.log("Document successfully written!");
    })
    .catch(function(error) {
        console.error("Error writing document: ", error);
    });

}

function doJoinRoom(){
    // Join Room
    // let joinRoom = document.querySelectorAll('.joinRoom');
    // console.log(joinRoom)
    auth.onAuthStateChanged((user) => {
        if (user){
            roomsRef = db.collection("rooms");
            
            joinRoom.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    console.log(e.target);
                    selectedRoomRef = roomsRef.doc(e.dataset.roomid);
                    selectedRoomRef.update({
                        lobby_list: firebase.firestore.FieldValue.arrayUnion(user.uid)
                    });
                    // e.dataset.roomid
                    // add my userID/random generated name to 
                    // lobby_list array in rooms collection
                    // change to room lobby view 
                    unsubscribe = selectedRoomRef
                    .onSnapshot(function(doc) {
                        console.log("Current data: ", doc.data());
                        // add/update user lobby list table
                        // using this data
                        const lobbyItems = argument.docs.map(doc => {
                            return `<li>${ doc.data().name }</li>`
                        });

                        // lobbyList.innerHTML = lobbyItems.join('');
                    }); 
                });
            });


        } else {
            accountDropdownBtn.innerHTML = `
                Guest <i class="material-icons right">
            `;
        }
    });
}

function AHT() {
    const ahtText = document.querySelector('#ahtText');

    ahtText.innerText =  "Time Elapsed: " + nhour + ":" + nmin + ":" + nsec;

    if (!isPaused) {
        nsec += 1;
        secondsElapsed++;
        if (nsec == 60) {
            nsec = 00;
            nmin += 1;
        } else if (nmin == 60) {
            nmin = 00;
            nhour += 1;
        }
    }
}

function doStart() {
    const ahtText = document.querySelector('#ahtText'),
    startTime = new Date();

    ahtText.setAttribute('data-startTime', startTime);

    if (!STARTED){
        refreshInterval = setInterval(AHT, 1000),
        ahtText.setAttribute('data-intervalID', refreshInterval),
        nmin = 0,
        nsec = 0,
        nhour = 0;
        STARTED = true;
        console.log("AHT started!");

        localStorage.setItem("refreshIntervalID", refreshInterval);
    }
}
  
const data = [
    // {
    //     id: "0",
    //     value: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquam placeat saepe soluta, tenetur ipsa dolorum velit quaerat quidem eligendi error."
    // },
    {
        id: 0,
        value: "To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her gender. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position."
    },
    {
        id: 1,
        value: "Indeed, apart from the nature of the investigation which my friend had on hand, there was something in his masterly grasp of a situation, and his keen, incisive reasoning, which made it a pleasure to me to study his system of work, and to follow the quick, subtle methods by which he disentangled the most inextricable mysteries. So accustomed was I to his invariable success that the very possibility of his failing had ceased to enter into my head."
    },
    {
        id: 2,
        value: "But this was too much. The wolf danced about with rage and swore he would come down the chimney and eat up the little pig for his supper. But while he was climbing on to the roof the little pig made up a blazing fire and put on a big pot full of water to boil. Then, just as the wolf was coming down the chimney, the little piggy pulled off the lid, and plop! In fell the wolf into the scalding water."
    },
    {
        id: 3,
        value: "So he huffed and he puffed and he blew the house down! The wolf was greedy and he tried to catch both pigs at once, but he was too greedy and got neither! His big jaws clamped down on nothing but air and the two little pigs scrambled away as fast as their little hooves would carry them. The wolf chased them down the lane and he almost caught them. But they made it to the brick house and slammed the door closed before the wolf could catch them."
    },
    {
        id: 4,
        value: "From time to time I heard some vague account of his doings: of his summons to Odessa in the case of the Trepoff murder, of his clearing up of the singular tragedy of the Atkinson brothers at Trincomalee, and finally of the mission which he had accomplished so delicately and successfully for the reigning family of Holland."
    },
    {
        id: 5,
        value: "The new boy went off brushing the dust from his clothes, sobbing, snuffling, and occasionally looking back and shaking his head and threatening what he would do to Tom the \"next time he caught him out.\" To which Tom responded with jeers, and started off in high feather, and as soon as his back was turned the new boy snatched up a stone, threw it and hit him between the shoulders and then turned tail and ran like an antelope. Tom chased the traitor home, and thus found out where he lived."
    }
    
];

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function generateCharactersID(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }


function doInitTyping(data){
    const typingArea = document.querySelector('#typing-area'),
        //   randomize based on array length
          number = getRandomInt(6),
          words = data[number].value.split(''),
          wordsToSpan = words.map((c) => `<span class="untyped">${c}</span>`);

    console.log(number)
    console.log(words)

    typingArea.innerHTML = wordsToSpan.join('');
    typingArea.firstElementChild.classList.add('current');
}

function doAddEventListener(e){
    // Variable Declaration
    const typingArea = document.querySelector('#typing-area'),
          wpmText = document.querySelector('#wpm-text'),
          ahtText = document.querySelector('#ahtText'),
          untypedCharacters = document.querySelectorAll('.untyped'),
          correctCharacters = document.querySelectorAll('.correct'),
          currentCharacter = document.querySelector('.current'),
          intervalID = ahtText.dataset.intervalid,
          startTime = new Date (ahtText.dataset.starttime);
          

    // console.log(untypedCharacters)
    // console.log(e.key + currentCharacter.textContent)

    // KeyboardEvent.ctrlKey
    // KeyboardEvent.shiftKey
    // KeyboardEvent.altKey

    // WPM = (5 * number of characters) / (time taken)
    wpmText.textContent = "WPM: " + Math.round((Math.abs((correctCharacters.length / secondsElapsed)) / 5) * 60);
    // WPM * Accuracy

    // START!
    doStart();

    const doEnd = () => {
        const endTime = new Date(),
            elapsedTime = (endTime - startTime) / 1000;
        
        //show scores
        //show final score

        //show time lapsed

        //init when after restart
        console.log(ahtText)
        console.log(intervalID)
        console.log(elapsedTime)

        // Stop timer
        clearInterval(intervalID);

        // Reset
        // doInitTyping(data);
    };

    const doProceed = () => {

        // check for accuracy && apply proper class
        e.key == currentCharacter.textContent ? currentCharacter.classList.add('correct') : currentCharacter.classList.add('wrong');

        // check for backspace
        if (e.keyCode == 8){
            console.log(e.key)
            currentCharacter.className = 'untyped';
            currentCharacter.previousElementSibling.className = "untyped current"
        } else {
            currentCharacter.classList.remove('current', 'untyped');
            currentCharacter.nextElementSibling ? currentCharacter.nextElementSibling.classList.add('current') : doEnd();
        }
    };
    
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey){
        console.log(e.key)
        if (e.shiftKey && e.key == currentCharacter.textContent){
            doProceed();
        } else {
            console.log("non backspace")
        }
    } else {
        doProceed();
    }


}