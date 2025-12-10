import React from 'react';
import { Htmx, HtmxA, HtmxButton } from '../react-htmx.js';

function ReactExample() {
  const [message, setMessage] = React.useState('');

  const handleAfterSwap = (event) => {
    console.log('Content loaded successfully:', event.detail);
    setMessage('Data loaded!');
  };

  const handleError = (event) => {
    console.error('Error loading data:', event.detail);
    setMessage('Failed to load data');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>React HTMX Example</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <HtmxA
          hxGet="/api/data"
          hxTarget="#content"
          hxSwap="innerHTML"
          hxTrigger="click"
          onHtmxAfterSwap={handleAfterSwap}
          onHtmxError={handleError}
          style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}
        >
          Load Data with HTMX
        </HtmxA>
        
        {message && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
            {message}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Htmx
          tagName="form"
          hxPost="/api/submit"
          hxTarget="#result"
          hxSwap="outerHTML"
          style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}
        >
          <input
            type="text"
            name="username"
            placeholder="Enter username"
            required
            style={{ padding: '0.5rem', flex: 1 }}
          />
          <HtmxButton
            type="submit"
            style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Submit
          </HtmxButton>
        </Htmx>
      </div>

      <div id="content" style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '4px', minHeight: '100px' }}>
        Click "Load Data" to fetch content here
      </div>

      <div id="result" style={{ marginTop: '2rem' }} />
    </div>
  );
}

export default ReactExample;
