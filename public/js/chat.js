const socket = io()

// Defining Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#share-location')
const $messages = document.querySelector('#messages')

// Defining Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Defining Options
// location.search to grab all parameters from url
// ignoreQueryPrefix to ignore the ? in url
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

// Receive an event
socket.on('message', (msg) => {
    console.log(msg)
    const html = Mustache.render(messageTemplate, {
        username: msg.username,
        message: msg.text,
        // Use moment library to format date/time
        createdAt: moment(msg.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (location) => {
    console.log(location)
    const locationHTML = Mustache.render(locationTemplate, {
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', locationHTML)
    autoscroll()
})

socket.on('roomInfo', ({ room, users }) => {
    const sidebarHTML = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#left-sidebar').innerHTML = sidebarHTML
})

$messageForm.addEventListener('submit', (e) => {
    // Prevent browser from refreshing after submitting
    e.preventDefault()

    // Disable form after submitting
    $messageFormButton.setAttribute('disabled', 'disabled')

    // Grab value of input with name="message"
    const message = e.target.elements.message.value

    // Send an event
    socket.emit('sendMessage', message, (error) => {
        // Enabling, clearing and focusing on form after delivering
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error){
            return console.log(error)
        }
        console.log('The message was delivered.')
    })
})

$sendLocationButton.addEventListener('click', () => {  
    // Return alert if browser does not support geolocation
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser!')
    }

    // Disabling button after submitting
    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => { 
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            // Re-enabling button after delivered
            $sendLocationButton.removeAttribute('disabled')
            
            console.log('Location shared.')
        })
    })
})

// Sending event of someone join a room to server
socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/'
    }
})