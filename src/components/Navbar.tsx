import React, {Suspense} from 'react';
import {Nav, Navbar, NavDropdown as ND} from 'react-bootstrap';

import * as T from './commonTypes';

const NavDropdown = React.lazy(() => import('react-bootstrap/NavDropdown'));

class NavbarCustom extends React.Component<{links: T.linkT}>{
    state = {update: true};
    update = () => {this.setState(this.state);}
    private makeScroller = (ref : T.chartRefT | T.parameterRefT) => {
        const scrollToRef = (ref : T.chartRefT | T.parameterRefT) => {
            window.scrollTo(0, ref.current!.scrollRef.current!.offsetTop);
        }
        return _ => scrollToRef(ref);
    }
    private makeDropdowns = (target : T.linkKeyT) => {
        return this.props.links[target].map((link, i) => {
            return <ND.Item onSelect={this.makeScroller(link[T.singleLinkIndex.ref])} key={i}>
            {link[T.singleLinkIndex.name]}</ND.Item>
        });
    };
    private scrollToTop = _ => window.scrollTo(0, 0);
    render(){
        return(
<Navbar variant="dark" bg="dark" expand="lg" fixed="top">
    <Navbar.Brand onClick={this.scrollToTop}>World of Warships Ballistics Calculator</Navbar.Brand>
    <Nav className="mr-auto">
        <Suspense fallback={<div>Loading...</div>}>
            <NavDropdown title="Parameters" id="basic-nav-dropdown">
                {this.makeDropdowns('parameters')}
            </NavDropdown>
        </Suspense>
        <Suspense fallback={<div>Loading...</div>}>
            <NavDropdown title="Impact Charts" id="basic-nav-dropdown">
                {this.makeDropdowns('impact')}
            </NavDropdown>
        </Suspense>
        <Suspense fallback={<div>Loading...</div>}>
            <NavDropdown title="Angle Charts" id="basic-nav-dropdown">
                {this.makeDropdowns('angle')}
            </NavDropdown>
        </Suspense>
        <Suspense fallback={<div>Loading...</div>}>
            <NavDropdown title="Post-Pentration Charts" id="basic-nav-dropdown">
                {this.makeDropdowns('post')}
            </NavDropdown>
        </Suspense>
    </Nav>
    <Nav className="navbar-right">
        <Suspense fallback={<div>Loading...</div>}>
            <NavDropdown title="Support" id="basic-nav-dropdown" alignRight>
                <ND.Item href="https://github.com/jcw780/wows_ballistics">Github</ND.Item>
                <ND.Item href="https://github.com/jcw780/wows_ballistics/issues">Issues</ND.Item>
            </NavDropdown>
        </Suspense>
    </Nav>
</Navbar>
        );
    }
}

export default NavbarCustom;