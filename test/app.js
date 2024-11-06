let selectedCandidate = null;
let votingInstance = null;
let userAccount = null;

// Inisialisasi Web3
async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            console.log('Provider:', window.ethereum);
            window.web3 = new Web3(window.ethereum);
            
            const networkId = await web3.eth.net.getId();
            console.log('Network ID:', networkId);
            
            return true;
        } catch (error) {
            console.error('Web3 initialization error:', error);
            return false;
        }
    } else {
        document.getElementById('status').textContent = 'Please install MetaMask!';
        return false;
    }
}

async function connectWallet() {
    try {
        // Tampilkan loading state
        document.getElementById('status').textContent = 'Connecting to MetaMask...';
        document.getElementById('connectButton').disabled = true;

        // Request akses ke akun MetaMask
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts',
            params: [{
                eth_accounts: {}
            }]
        });

        // Jika berhasil terkoneksi
        if (accounts.length > 0) {
            userAccount = accounts[0];
            
            // Update UI
            document.getElementById('accountAddress').textContent = 
                `Connected: ${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
            document.getElementById('status').className = 'success';
            document.getElementById('status').textContent = 'Successfully connected to MetaMask!';
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('votingSection').style.display = 'block';
            
            // Initialize voting interface
            await initVoting();
        }
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = 
            error.code === 4001 
                ? 'Please connect to MetaMask to continue.' 
                : 'Error connecting to MetaMask. Please try again.';
        document.getElementById('connectButton').disabled = false;
    }
}

// Tambahkan fungsi untuk memeriksa koneksi MetaMask
async function checkConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Cek apakah sudah terkoneksi
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                userAccount = accounts[0];
                document.getElementById('accountAddress').textContent = 
                    `Connected: ${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
                await initVoting();
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        }
    }
}

// Fetch the contract artifact
async function initContract() {
    try {
        const response = await fetch('../build/contracts/Voting.json');
        const VotingArtifact = await response.json();
        
        console.log('Contract Artifact:', VotingArtifact);
        
        const Voting = TruffleContract(VotingArtifact);
        Voting.setProvider(web3.currentProvider);
        
        const networks = VotingArtifact.networks;
        const networkId = await web3.eth.net.getId();
        
        if (!networks[networkId]) {
            throw new Error(`Contract not deployed on network ${networkId}`);
        }
        
        return await Voting.deployed();
    } catch (error) {
        console.error('Error initializing contract:', error);
        document.getElementById('status').textContent = 'Error loading contract';
        return null;
    }
}

function createCandidateCard(candidate) {
    const div = document.createElement('div');
    div.className = 'candidate';
    div.id = `candidate-${candidate}`;
    div.onclick = () => selectCandidate(candidate);
    
    let candidateInfo = '';
    switch(candidate) {
        case 'John':
            candidateInfo = 'Experienced Leader';
            break;
        case 'Mery':
            candidateInfo = 'Innovation Expert';
            break;
        case 'Abdul':
            candidateInfo = 'Community Builder';
            break;
    }
    
    div.innerHTML = `
        <h3>${candidate}</h3>
        <p class="candidate-info">${candidateInfo}</p>
        <p>Votes: <span id="votes-${candidate}">0</span></p>
    `;
    return div;
}

function selectCandidate(candidate) {
    document.querySelectorAll('.candidate').forEach(el => {
        el.classList.remove('selected');
    });
    
    document.querySelector(`#candidate-${candidate}`).classList.add('selected');
    selectedCandidate = candidate;
    document.getElementById('voteButton').disabled = false;
}

async function updateVoteCount(candidate) {
    try {
        const votes = await votingInstance.getVotes(candidate);
        document.getElementById(`votes-${candidate}`).textContent = votes.toString();
    } catch (error) {
        console.error('Error updating vote count:', error);
    }
}

async function castVote() {
    if (!selectedCandidate) {
        document.getElementById('status').textContent = 'Please select a candidate first';
        return;
    }

    try {
        document.getElementById('status').textContent = 'Processing vote...';
        document.getElementById('voteButton').disabled = true;

        await votingInstance.vote(selectedCandidate, { from: userAccount });
        
        document.getElementById('status').className = 'success';
        document.getElementById('status').textContent = 'Vote successfully cast!';
        await updateVoteCount(selectedCandidate);
    } catch (error) {
        document.getElementById('status').className = 'error';
        document.getElementById('status').textContent = 'Error casting vote: ' + error.message;
        document.getElementById('voteButton').disabled = false;
    }
}

async function initVoting() {
    votingInstance = await initContract();
    if (votingInstance) {
        try {
            const candidates = await votingInstance.getCandidates();
            const candidatesDiv = document.getElementById('candidates');
            candidatesDiv.innerHTML = ''; // Clear existing candidates
            
            candidates.forEach(candidate => {
                const card = createCandidateCard(candidate);
                candidatesDiv.appendChild(card);
                updateVoteCount(candidate);
            });

            // Check if user has already voted
            const hasVoted = await votingInstance.hasUserVoted(userAccount);
            if (hasVoted) {
                document.getElementById('status').textContent = 'You have already voted';
                document.getElementById('voteButton').disabled = true;
            }
        } catch (error) {
            console.error('Error loading candidates:', error);
            document.getElementById('status').textContent = 'Error loading candidates';
        }
    }
}

// Initialize the application
window.addEventListener('load', async () => {
    if (await initWeb3()) {
        // Cek koneksi saat halaman dimuat
        await checkConnection();
        
        // Setup event listeners
        document.getElementById('connectButton').onclick = connectWallet;
        document.getElementById('voteButton').onclick = castVote;
        
        // Listen untuk perubahan network
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
        
        // Listen untuk perubahan akun
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                // User disconnect dari MetaMask
                document.getElementById('loginSection').style.display = 'block';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('status').textContent = 'Please connect to MetaMask';
                document.getElementById('connectButton').disabled = false;
            } else {
                window.location.reload();
            }
        });
    }
});

// Handle account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
        window.location.reload();
    });
}
