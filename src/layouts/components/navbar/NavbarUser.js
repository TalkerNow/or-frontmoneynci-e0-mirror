import React from "react"
import {
  NavItem,
  NavLink,
  UncontrolledDropdown,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Media,
  Button,
  Badge
} from "reactstrap"
import PerfectScrollbar from "react-perfect-scrollbar"
import axios from "axios"
import * as Icon from "react-feather"
import classnames from "classnames"
import ReactCountryFlag from "react-country-flag"
import Autocomplete from "../../../components/@vuexy/autoComplete/AutoCompleteComponent"
import { history } from "../../../history"
import { IntlContext } from "../../../utility/context/Internationalization"

const handleNavigation = (e, path) => {
  e.preventDefault()
  history.push(path)
}

const UserDropdown = props => {
  return (
    <DropdownMenu right>
      <DropdownItem
        tag="a"
        href="#"
        onClick={e => handleNavigation(e, "/app/profile")}
      >
        <Icon.User size={14} className="mr-50" />
        <span className="align-middle">Edit Profile</span>
      </DropdownItem>
      {/* <DropdownItem
        tag="a"
        href="#"
        onClick={e => handleNavigation(e, "/email/inbox")}
      >
        <Icon.Mail size={14} className="mr-50" />
        <span className="align-middle">My Inbox</span>
      </DropdownItem> */}
      {/*<DropdownItem*/}
      {/*  tag="a"*/}
      {/*  href="#"*/}
      {/*  onClick={e => handleNavigation(e, "/clientTask/all")}*/}
      {/*>*/}
      {/*  <Icon.CheckSquare size={14} className="mr-50" />*/}
      {/*  <span className="align-middle">Tasks</span>*/}
      {/*</DropdownItem>*/}
      {/* <DropdownItem
        tag="a"
        href="#"
        onClick={e => handleNavigation(e, "/chat")}
      >
        <Icon.MessageSquare size={14} className="mr-50" />
        <span className="align-middle">Chats</span>
      </DropdownItem> */}
      {/* <DropdownItem tag="a" href="#" onClick={e => handleNavigation(e, "/ecommerce/wishlist")}>
        <Icon.Heart size={14} className="mr-50" />
        <span className="align-middle">WishList</span>
      </DropdownItem> */}
      <DropdownItem divider />
      <DropdownItem
        tag="a"
        href="/pages/login"
        onClick={e => {
          e.preventDefault()
          return props.logoutWithJWT();
          }
        }
      >
        <Icon.Power size={14} className="mr-50" />
        <span className="align-middle">Log Out</span>
      </DropdownItem>
    </DropdownMenu>
  )
}

class NavbarUser extends React.PureComponent {
  state = {
    unread_count: 0,
    navbarSearch: false,
    langDropdown: false,
    suggestions: []
  }

  componentDidMount() {
    axios.get("/api/main-search/data").then(({ data }) => {
      this.setState({ suggestions: data.searchResult })
    })

    var Config = {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
    axios.get(global.config.server_url + "/unread_count", Config).then(response => {
      if(response.data.count > 0)
        this.setState({ unread_count:response.data.count})
    })
  }

  handleNavbarSearch = () => {
    this.setState({
      navbarSearch: !this.state.navbarSearch
    })
  }


  handleLangDropdown = () =>
    this.setState({ langDropdown: !this.state.langDropdown })

  render() {
    return (
      <ul className="nav navbar-nav navbar-nav-user float-right">
        <IntlContext.Consumer>
          {context => {
            let langArr = {
              "en" : "English",
              "fr" : "Français",
            }
            return (
              <Dropdown
                tag="li"
                className="dropdown-language nav-item"
                isOpen={this.state.langDropdown}
                toggle={this.handleLangDropdown}
                data-tour="language"
              >
                <DropdownToggle
                  tag="a"
                  className="nav-link"
                >
                  <ReactCountryFlag
                  className="country-flag"
                    countryCode={
                      context.state.locale === "en"
                        ? "us"
                        : context.state.locale
                    }
                    svg
                  />
                  <span className="d-sm-inline-block d-none text-capitalize align-middle ml-50">
                    {langArr[context.state.locale]}
                  </span>
                </DropdownToggle>
                <DropdownMenu right>
                  <DropdownItem
                    tag="a"
                    onClick={e => context.switchLanguage("en")}
                  >
                    <ReactCountryFlag className="country-flag" countryCode="us" svg />
                    <span className="ml-1">English</span>
                  </DropdownItem>
                  <DropdownItem
                    tag="a"
                    onClick={e => context.switchLanguage("fr")}
                  >
                    <ReactCountryFlag className="country-flag" countryCode="fr" svg />
                    <span className="ml-1">Français</span>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )
          }}
        </IntlContext.Consumer>

        <NavItem className="nav-search" onClick={this.handleNavbarSearch}>
          <NavLink className="nav-link-search">
            <Icon.Search size={21} data-tour="search" />
          </NavLink>
          <div
            className={classnames("search-input", {
              open: this.state.navbarSearch,
              "d-none": this.state.navbarSearch === false
            })}
          >
            <div className="search-input-icon">
              <Icon.Search size={17} className="primary" />
            </div>
            <Autocomplete
              className="form-control"
              suggestions={this.state.suggestions}
              filterKey="title"
              filterHeaderKey="groupTitle"
              grouped={true}
              placeholder="Explore Vuexy..."
              autoFocus={true}
              clearInput={this.state.navbarSearch}
              externalClick={e => {
                this.setState({ navbarSearch : false })
              }}
              onKeyDown={e => {
                if (e.keyCode === 27 || e.keyCode === 13) {
                  this.setState({
                    navbarSearch: false
                  })
                  this.props.handleAppOverlay("")
                }
              }}
              customRender={(
                item,
                i,
                filteredData,
                activeSuggestion,
                onSuggestionItemClick,
                onSuggestionItemHover
              ) => {
                const IconTag = Icon[item.icon ? item.icon : "X"]
                return (
                  <li
                    className={classnames("suggestion-item", {
                      active: filteredData.indexOf(item) === activeSuggestion
                    })}
                    key={i}
                    onClick={e => onSuggestionItemClick(item.link, e)}
                    onMouseEnter={() =>
                      onSuggestionItemHover(filteredData.indexOf(item))
                    }
                  >
                    <div
                      className={classnames({
                        "d-flex justify-content-between align-items-center":
                          item.file || item.img
                      })}
                    >
                      <div className="item-container d-flex">
                        {item.icon ? (
                          <IconTag size={17} />
                        ) : item.file ? (
                          <img
                            src={item.file}
                            height="36"
                            width="28"
                            alt={item.title}
                          />
                        ) : item.img ? (
                          <img
                            className="rounded-circle mt-25"
                            src={item.img}
                            height="28"
                            width="28"
                            alt={item.title}
                          />
                        ) : null}
                        <div className="item-info ml-1">
                          <p className="align-middle mb-0">{item.title}</p>
                          {item.by || item.email ? (
                            <small className="text-muted">
                              {item.by
                                ? item.by
                                : item.email
                                ? item.email
                                : null}
                            </small>
                          ) : null}
                        </div>
                      </div>
                      {item.size || item.date ? (
                        <div className="meta-container">
                          <small className="text-muted">
                            {item.size
                              ? item.size
                              : item.date
                              ? item.date
                              : null}
                          </small>
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              }}
              onSuggestionsShown={userInput => {
                if (this.state.navbarSearch) {
                  this.props.handleAppOverlay(userInput)
                }
              }}
            />
            <div className="search-input-close">
              <Icon.X
                size={24}
                onClick={(e) => {
                  e.stopPropagation()
                  this.setState({
                    navbarSearch: false
                  })
                  this.props.handleAppOverlay("")
                }}
              />
            </div>
          </div>
        </NavItem>
        <UncontrolledDropdown
          tag="li"
          className="dropdown-notification nav-item"
        >
          <DropdownToggle tag="a" className="nav-link nav-link-label">
            <Icon.Bell size={21} />
            {this.state.unread_count > 0 &&
              <Badge pill color="primary" className="badge-up">
                {" "}
                {this.state.unread_count + " "}
              </Badge>
            }
          </DropdownToggle>
          {this.state.unread_count > 0 &&
          <DropdownMenu tag="ul" right className="dropdown-menu-media">
            <li className="dropdown-menu-header">
              <div className="dropdown-header mt-0">
                <h3 className="text-white">{this.state.unread_count} New</h3>
                <span className="notification-title">App Notifications</span>
              </div>
            </li>
            <PerfectScrollbar
                className="media-list overflow-hidden position-relative"
                options={{
                  wheelPropagation: false
                }}
            >
              <div className="d-flex justify-content-between">
                <Media className="d-flex align-items-start">
                  <Media body>
                    <Media heading className="primary media-heading" tag="h6" onClick={() => {history.push("/clientTask/unread")}}>
                      You have {this.state.unread_count} unread tasks
                    </Media>
                    <p className="notification-text">
                      Are your going to check the tasks?
                    </p>
                  </Media>
                </Media>
              </div>
            </PerfectScrollbar>
          </DropdownMenu>
          }
        </UncontrolledDropdown>
        <UncontrolledDropdown tag="li" className="dropdown-user nav-item">
          <DropdownToggle tag="a" className="nav-link dropdown-user-link">
            <div className="user-nav d-sm-flex d-none">
              <span className="user-name text-bold-600">
                {this.props.userName}
              </span>
              <span className="user-status">Available</span>
            </div>
            <span data-tour="user">
              <img
                src={this.props.userImg}
                className="round"
                height="40"
                width="40"
                alt="avatar"
              />
            </span>
          </DropdownToggle>
          <UserDropdown {...this.props} />
        </UncontrolledDropdown>
      </ul>
    )
  }
}
export default NavbarUser
