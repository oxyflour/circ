import makeAPI from 'kyoko-mesh/dist/web'
import API from '../api'

export default makeAPI<typeof API>('http://localhost:8080')
