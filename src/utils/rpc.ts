import makeAPI from 'kyoko-mesh/dist/web'
import API from '../api'

export default makeAPI<typeof API>('https://localhost:8443')
