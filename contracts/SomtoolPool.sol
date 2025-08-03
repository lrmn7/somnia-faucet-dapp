// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SomtoolPool is ERC20 {
    constructor() ERC20("SomtoolPool", "SMTL-POOL") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract MultiSomtoolPool is ReentrancyGuard {
    IERC20[] public tokens;
    mapping(address => uint256) public reserves;
    mapping(address => bool) public isTokenSupported;
    SomtoolPool public immutable somtoolPool;

    uint256 private constant MIN_TOKENS = 2;
    uint256 private constant MAX_TOKENS = 5;

    event LiquidityAdded(address indexed user, uint256[] amounts, uint256 lpMinted);
    event LiquidityRemoved(address indexed user, uint256[] amounts, uint256 lpBurned);
    event Swapped(address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);

    constructor(address[] memory _tokenAddresses) {
        require(_tokenAddresses.length >= MIN_TOKENS && _tokenAddresses.length <= MAX_TOKENS, "Invalid number of tokens");

        for (uint i = 0; i < _tokenAddresses.length; i++) {
            address tokenAddr = _tokenAddresses[i];
            require(tokenAddr != address(0), "Invalid token address");
            require(!isTokenSupported[tokenAddr], "Duplicate tokens not allowed");

            tokens.push(IERC20(tokenAddr));
            isTokenSupported[tokenAddr] = true;
        }

        somtoolPool = new SomtoolPool();
    }

    function addLiquidity(uint256[] memory _amounts) external nonReentrant returns (uint256 lpAmount) {
        require(_amounts.length == tokens.length, "Amounts array length must match tokens array");

        uint256 lpTotalSupply = somtoolPool.totalSupply();

        for (uint i = 0; i < tokens.length; i++) {
            if (_amounts[i] > 0) {
                tokens[i].transferFrom(msg.sender, address(this), _amounts[i]);
            }
        }
        
        if (lpTotalSupply == 0) {
            uint256 totalValue;
            for(uint i = 0; i < _amounts.length; i++) {
                require(_amounts[i] > 0, "Must provide initial liquidity for all tokens");
                totalValue += _amounts[i];
            }
            lpAmount = totalValue;
        } else {
            uint256 minRatio = type(uint256).max;
            for (uint i = 0; i < tokens.length; i++) {
                if (_amounts[i] > 0) {
                    uint256 ratio = (_amounts[i] * lpTotalSupply) / reserves[address(tokens[i])];
                    if (ratio < minRatio) {
                        minRatio = ratio;
                    }
                }
            }
            lpAmount = minRatio;
        }

        require(lpAmount > 0, "LP amount must be greater than 0");
        somtoolPool.mint(msg.sender, lpAmount);
        
        _updateAllReserves();

        emit LiquidityAdded(msg.sender, _amounts, lpAmount);
    }
    
    function removeLiquidity(uint256 _lpAmount) external nonReentrant {
        require(_lpAmount > 0, "Invalid LP amount");
        
        uint256 lpTotalSupply = somtoolPool.totalSupply();
        uint256[] memory amountsOut = new uint256[](tokens.length);

        somtoolPool.burn(msg.sender, _lpAmount);

        for (uint i = 0; i < tokens.length; i++) {
            address tokenAddr = address(tokens[i]);
            uint256 amountToReturn = (_lpAmount * reserves[tokenAddr]) / lpTotalSupply;
            if (amountToReturn > 0) {
                amountsOut[i] = amountToReturn;
                tokens[i].transfer(msg.sender, amountToReturn);
            }
        }
        
        _updateAllReserves();
        emit LiquidityRemoved(msg.sender, amountsOut, _lpAmount);
    }

    function swap(address _tokenIn, address _tokenOut, uint256 _amountIn) external nonReentrant returns (uint256 amountOut) {
        require(isTokenSupported[_tokenIn] && isTokenSupported[_tokenOut], "Tokens not supported");
        require(_tokenIn != _tokenOut, "Cannot swap same token");
        require(_amountIn > 0, "Amount in must be positive");
        
        uint256 reserveIn = reserves[_tokenIn];
        uint256 reserveOut = reserves[_tokenOut];

        require(reserveIn > 0 && reserveOut > 0, "Insufficient reserves");

        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn);

        uint256 amountInWithFee = _amountIn * 997; // 1000 - 3 (fee)
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
        
        require(amountOut > 0, "Insufficient output amount");

        IERC20(_tokenOut).transfer(msg.sender, amountOut);
        
        _updateReserve(_tokenIn);
        _updateReserve(_tokenOut);

        emit Swapped(msg.sender, _tokenIn, _amountIn, _tokenOut, amountOut);
    }


    function _updateReserve(address _tokenAddr) private {
        reserves[_tokenAddr] = IERC20(_tokenAddr).balanceOf(address(this));
    }

    function _updateAllReserves() private {
        for (uint i = 0; i < tokens.length; i++) {
            _updateReserve(address(tokens[i]));
        }
    }
    
    function getPoolState() external view returns (address[] memory, uint256[] memory) {
        uint256[] memory currentReserves = new uint256[](tokens.length);
        address[] memory tokenAddresses = new address[](tokens.length);
        for (uint i = 0; i < tokens.length; i++) {
            address tokenAddr = address(tokens[i]);
            tokenAddresses[i] = tokenAddr;
            currentReserves[i] = reserves[tokenAddr];
        }
        return (tokenAddresses, currentReserves);
    }
}